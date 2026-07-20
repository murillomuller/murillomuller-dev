import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { applications, jobs, workerRuns, jobSearchPrefs } from '@/db/schema';
import { desc, gte, inArray, eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const days = Number(url.searchParams.get('days')) || 14;
  const since = Date.now() - days * 24 * 60 * 60 * 1000;

  const prefs = await db.select().from(jobSearchPrefs).limit(1).then(r => r[0]);
  const metaDiaria = prefs?.maxAppliesPerDay || 20;

  const recentRuns = await db.select()
    .from(workerRuns)
    .where(gte(workerRuns.startedAt, since))
    .orderBy(desc(workerRuns.startedAt));

  const apps = await db.select({
      id: applications.id,
      status: applications.status,
      updatedAt: applications.updatedAt,
      matchScore: applications.matchScore,
      jobTitle: jobs.title,
      jobCompany: jobs.company,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(gte(applications.updatedAt, since));

  const startOfToday = new Date().setHours(0, 0, 0, 0); // approx local, good enough for UI display
  
  let appliedToday = 0;
  let appliedWeek = 0;
  let needsReview = 0;
  let scoreSum = 0;
  let scoreCount = 0;

  const byDate: Record<string, { applied: number, failed: number, review: number }> = {};
  const statusCounts: Record<string, number> = {};

  for (const app of apps) {
    statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;

    const dateStr = new Date(app.updatedAt).toISOString().split('T')[0];
    if (!byDate[dateStr]) byDate[dateStr] = { applied: 0, failed: 0, review: 0 };

    if (['applied_auto', 'applied_manual'].includes(app.status)) {
      byDate[dateStr].applied++;
      if (app.updatedAt >= startOfToday) appliedToday++;
      if (app.updatedAt >= Date.now() - 7 * 24 * 60 * 60 * 1000) appliedWeek++;
      
      if (app.matchScore != null) {
        scoreSum += app.matchScore;
        scoreCount++;
      }
    } else if (app.status === 'needs_review') {
      byDate[dateStr].review++;
      needsReview++;
    } else if (app.status === 'failed') {
      byDate[dateStr].failed++;
    }
  }

  const avgScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0;

  // Last applications today
  const todaysApps = apps
    .filter(a => a.updatedAt >= startOfToday)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map(a => ({
      title: a.jobTitle,
      company: a.jobCompany,
      status: a.status,
      score: a.matchScore,
      time: a.updatedAt
    }));

  return NextResponse.json({
    ok: true,
    kpis: {
      appliedToday,
      metaDiaria,
      appliedWeek,
      needsReview,
      avgScore
    },
    byDate,
    statusCounts,
    todaysApps,
    recentRuns: recentRuns.slice(0, 10).map(r => ({
      id: r.id,
      time: r.startedAt,
      applied: r.applied,
      needsReview: r.needsReview,
      skipped: r.skipped,
      message: r.message
    }))
  });
}
