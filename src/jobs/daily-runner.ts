import { db } from '@/db';
import { applications, jobs, jobSearchPrefs, workerRuns } from '@/db/schema';
import { ensureJobFitScore } from '@/jobs/ai/matcher';
import { LinkedInProvider } from '@/jobs/providers/linkedin';
import { applyToJobById } from '@/jobs/apply/apply-job';
import { desc, eq, inArray } from 'drizzle-orm';

function getStartOfDayBRT(): number {
  const now = new Date();
  const options = { timeZone: 'America/Sao_Paulo', year: 'numeric', month: 'numeric', day: 'numeric' } as const;
  const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(now);
  const m = parts.find(p => p.type === 'month')?.value;
  const d = parts.find(p => p.type === 'day')?.value;
  const y = parts.find(p => p.type === 'year')?.value;
  
  if (y && m && d) {
    const brtString = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00.000-03:00`;
    return new Date(brtString).getTime();
  }
  
  return new Date().setHours(0, 0, 0, 0);
}

export async function countAppliesToday(): Promise<number> {
  const startOfDay = getStartOfDayBRT();
  const allApps = await db
    .select({ id: applications.id, status: applications.status, updatedAt: applications.updatedAt })
    .from(applications);
    
  return allApps.filter(
    (app) => ['applied_auto', 'applied_manual', 'needs_review', 'failed'].includes(app.status) && app.updatedAt >= startOfDay
  ).length;
}

export async function runDailyCycle() {
  console.log('[DailyRunner] Starting cycle...');
  const startedAt = Date.now();
  let searched = 0;
  let scored = 0;
  let applied = 0;
  let needsReview = 0;
  let failed = 0;
  let skippedCount = 0;

  const prefs = await db.select().from(jobSearchPrefs).limit(1).then(r => r[0]);
  if (!prefs) {
    throw new Error('No job search prefs');
  }

  const [runRecord] = await db.insert(workerRuns).values({
    startedAt,
    message: 'Started',
  }).returning();

  try {
    const appliesToday = await countAppliesToday();
    const quota = Math.max(0, prefs.maxAppliesPerDay - appliesToday);
    
    console.log(`[DailyRunner] Applies today: ${appliesToday}, Meta: ${prefs.maxAppliesPerDay}, Quota: ${quota}`);

    if (quota <= 0) {
      await db.update(workerRuns).set({
        endedAt: Date.now(),
        message: 'Quota reached for today.',
      }).where(eq(workerRuns.id, runRecord.id));
      return { searched: 0, scored: 0, applied: 0, needsReview: 0, remainingQuota: 0 };
    }

    const keywordList = prefs.keywords.split(',').map(k => k.trim()).filter(Boolean);
    const searchKeyword = keywordList[0] || 'Frontend Engineer';

    const provider = new LinkedInProvider();
    let results = [];
    try {
      results = await provider.search({
        ...prefs,
        keywords: searchKeyword,
        easyApplyOnly: true,
        postedWithin: '24h',
        limit: Math.max(15, quota + 5)
      });
    } finally {
      await provider.close();
    }
    
    searched += results.length;

    const candidateJobIds: number[] = [];

    for (const raw of results) {
      let jobRecord = await db.select().from(jobs).where(eq(jobs.externalId, raw.externalId)).limit(1).then(r => r[0]);
      if (!jobRecord) {
        const [inserted] = await db.insert(jobs).values({
          source: 'linkedin',
          externalId: raw.externalId,
          url: raw.url,
          title: raw.title,
          company: raw.company,
          location: raw.location,
          descriptionFull: '',
          descriptionSummary: raw.descriptionSummary,
        }).returning();
        jobRecord = inserted;
        await db.insert(applications).values({ jobId: jobRecord.id });
      }

      const app = await db.select().from(applications).where(eq(applications.jobId, jobRecord.id)).limit(1).then(r => r[0]);
      if (app && ['discovered', 'matched'].includes(app.status)) {
        candidateJobIds.push(jobRecord.id);
      }
    }

    for (const jid of candidateJobIds) {
      const app = await db.select().from(applications).where(eq(applications.jobId, jid)).limit(1).then(r => r[0]);
      if (app?.matchScore == null) {
        await ensureJobFitScore(jid);
        scored++;
      }
    }

    const candidates = await db
      .select({ id: applications.id, jobId: applications.jobId, matchScore: applications.matchScore })
      .from(applications)
      .where(inArray(applications.jobId, candidateJobIds));

    // Sort by match score desc
    candidates.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    let appliesDoneThisRun = 0;

    for (const cand of candidates) {
      if (appliesDoneThisRun >= quota) break;

      if ((cand.matchScore || 0) < prefs.minMatchScore) {
        await db.update(applications).set({ status: 'skipped', updatedAt: Date.now() }).where(eq(applications.id, cand.id));
        skippedCount++;
        continue;
      }

      console.log(`[DailyRunner] Applying to job ${cand.jobId} (score: ${cand.matchScore})`);
      const result = await applyToJobById(cand.jobId);
      
      if (result.status === 'applied_auto') {
        applied++;
        appliesDoneThisRun++;
      } else if (result.status === 'needs_review') {
        needsReview++;
        appliesDoneThisRun++; // Attempted
      } else if (result.status === 'failed') {
        failed++;
        // Do we count failed towards quota? Probably not.
      }
    }

    await db.update(workerRuns).set({
      endedAt: Date.now(),
      searched,
      scored,
      applied,
      needsReview,
      failed,
      skipped: skippedCount,
      message: `Success. Quota left: ${quota - appliesDoneThisRun}`,
    }).where(eq(workerRuns.id, runRecord.id));

    return { searched, scored, applied, needsReview, remainingQuota: Math.max(0, quota - appliesDoneThisRun) };

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[DailyRunner] Error:', msg);
    await db.update(workerRuns).set({
      endedAt: Date.now(),
      searched,
      scored,
      applied,
      needsReview,
      failed,
      skipped: skippedCount,
      message: `Error: ${msg}`,
    }).where(eq(workerRuns.id, runRecord.id));
    throw error;
  }
}
