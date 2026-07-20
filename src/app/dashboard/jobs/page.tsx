import { db } from '@/db';
import { applications, jobSearchPrefs, jobs, skills } from '@/db/schema';
import { ManualJobSearchClient } from '@/components/dashboard/ManualJobSearchClient';
import { parseFitReasons } from '@/jobs/ai/matcher';
import { asc, desc, eq } from 'drizzle-orm';

export default async function JobsDashboardPage() {
  const prefs = await db.select().from(jobSearchPrefs).limit(1).then((r) => r[0]);
  const skillRows = await db.select({ name: skills.name }).from(skills).orderBy(asc(skills.sortOrder)).limit(12);

  const rows = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      company: jobs.company,
      location: jobs.location,
      url: jobs.url,
      salaryText: jobs.salaryText,
      source: jobs.source,
      status: applications.status,
      matchScore: applications.matchScore,
      matchReasons: applications.matchReasons,
      descriptionFull: jobs.descriptionFull,
    })
    .from(jobs)
    .leftJoin(applications, eq(applications.jobId, jobs.id))
    .orderBy(desc(jobs.id))
    .limit(50);

  const initialJobs = rows.map((r) => {
    const fit = parseFitReasons(r.matchReasons);
    return {
      id: r.id,
      title: r.title,
      company: r.company,
      location: r.location,
      url: r.url,
      salaryText: r.salaryText,
      source: r.source,
      status: r.status,
      matchScore: r.matchScore,
      fitSummary: fit?.summary || null,
      hasDetails: !!(r.descriptionFull && r.descriptionFull.length > 80),
    };
  });

  return (
    <div className="space-y-6">
      <ManualJobSearchClient
        initialJobs={initialJobs}
        defaultKeywords={prefs?.keywords || 'Frontend Engineer, React, Next.js, TypeScript'}
        defaultLocations={prefs?.locations || 'Brazil, Remote'}
        skillPresets={skillRows.map((s) => s.name)}
      />
    </div>
  );
}
