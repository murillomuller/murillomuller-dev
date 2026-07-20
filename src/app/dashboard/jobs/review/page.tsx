import { ReviewResolveClient } from '@/components/dashboard/ReviewResolveClient';
import { db } from '@/db';
import { applications, applyLogs, jobs } from '@/db/schema';
import { seedScreeningMemoryDefaults } from '@/jobs/ai/screening-memory';
import { desc, eq, inArray } from 'drizzle-orm';

export default async function JobReviewDashboard() {
  await seedScreeningMemoryDefaults();

  const reviewApps = await db
    .select({
      id: applications.id,
      status: applications.status,
      matchScore: applications.matchScore,
      jobId: jobs.id,
      title: jobs.title,
      company: jobs.company,
      url: jobs.url,
      location: jobs.location,
      pendingError: applications.pendingError,
      pendingFieldsJson: applications.pendingFieldsJson,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(inArray(applications.status, ['needs_review', 'awaiting_confirmation', 'failed']))
    .orderBy(desc(applications.updatedAt));

  const items = [];
  for (const app of reviewApps) {
    let pendingFields: unknown[] = [];
    try {
      pendingFields = app.pendingFieldsJson ? JSON.parse(app.pendingFieldsJson) : [];
    } catch {
      pendingFields = [];
    }
    const logs = await db
      .select({ message: applyLogs.message, step: applyLogs.step })
      .from(applyLogs)
      .where(eq(applyLogs.applicationId, app.id))
      .orderBy(desc(applyLogs.id))
      .limit(5);

    items.push({
      id: app.id,
      jobId: app.jobId,
      status: app.status,
      matchScore: app.matchScore,
      title: app.title,
      company: app.company,
      url: app.url,
      location: app.location,
      pendingError: app.pendingError,
      pendingFields: Array.isArray(pendingFields) ? pendingFields : [],
      logHints: logs.map((l) => `${l.step}: ${l.message.slice(0, 160)}`),
    });
  }

  return <ReviewResolveClient items={items as any} />;
}
