import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { applications, jobSearchPrefs, jobs } from '@/db/schema';
import { ensureJobFitScore } from '@/jobs/ai/matcher';
import { LinkedInProvider } from '@/jobs/providers/linkedin';
import { eq } from 'drizzle-orm';

export const maxDuration = 180;
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const overrideKeywords = typeof body.keywords === 'string' ? body.keywords : undefined;
  const overrideLocations = typeof body.locations === 'string' ? body.locations : undefined;
  const limit = Number(body.limit) || 15;
  // Manual search defaults to all jobs; Easy Apply filter is opt-in
  const easyApplyOnly = body.easyApplyOnly === true;

  let prefs = await db.select().from(jobSearchPrefs).limit(1).then((r) => r[0]);
  if (!prefs) {
    await db.insert(jobSearchPrefs).values({
      keywords: 'React, Next.js, Fullstack',
      titles: 'Frontend, Fullstack',
      locations: 'Brazil, Remote',
    });
    prefs = await db.select().from(jobSearchPrefs).limit(1).then((r) => r[0]);
  }

  const searchPrefs = {
    keywords: overrideKeywords || prefs?.keywords || 'Frontend Engineer',
    titles: prefs?.titles || '',
    locations: overrideLocations || prefs?.locations || 'Brazil',
    limit,
    easyApplyOnly,
  };

  // Persist what the user searched so keywords/locations keep accumulating
  if (prefs && (overrideKeywords != null || overrideLocations != null)) {
    await db
      .update(jobSearchPrefs)
      .set({
        ...(overrideKeywords != null ? { keywords: overrideKeywords } : {}),
        ...(overrideLocations != null ? { locations: overrideLocations } : {}),
      })
      .where(eq(jobSearchPrefs.id, prefs.id));
  }

  const provider = new LinkedInProvider();
  console.log('[jobs/search] starting', searchPrefs);
  try {
    const results = await provider.search(searchPrefs);
    console.log('[jobs/search] found', results.length, 'jobs');
    let inserted = 0;
    let updated = 0;
    let scored = 0;
    const jobIds: number[] = [];

    for (const raw of results) {
      console.log('[jobs/search] upsert', raw.externalId, raw.title, raw.company);
      const existing = await db
        .select()
        .from(jobs)
        .where(eq(jobs.externalId, raw.externalId))
        .limit(1)
        .then((r) => r[0]);

      let jobId: number;
      if (existing) {
        await db
          .update(jobs)
          .set({
            title: raw.title,
            company: raw.company,
            location: raw.location,
            url: raw.url,
            descriptionSummary: raw.descriptionSummary || existing.descriptionSummary,
          })
          .where(eq(jobs.id, existing.id));
        jobId = existing.id;
        updated++;
      } else {
        const [row] = await db
          .insert(jobs)
          .values({
            source: 'linkedin',
            externalId: raw.externalId,
            url: raw.url,
            title: raw.title,
            company: raw.company,
            location: raw.location,
            descriptionFull: '',
            descriptionSummary: raw.descriptionSummary || null,
          })
          .returning();
        jobId = row.id;
        inserted++;

        await db.insert(applications).values({
          jobId,
          status: 'discovered',
        });
      }
      jobIds.push(jobId);
    }

    // Fit vs CV (OpenAI) — only when matchScore is still missing
    for (const jobId of jobIds) {
      try {
        const app = await db
          .select()
          .from(applications)
          .where(eq(applications.jobId, jobId))
          .limit(1)
          .then((r) => r[0]);
        if (app?.matchScore != null) continue;
        await ensureJobFitScore(jobId);
        scored++;
      } catch (err) {
        console.error('[jobs/search] fit score failed for', jobId, err);
      }
    }

    console.log('[jobs/search] done', { inserted, updated, scored, count: results.length });
    return NextResponse.json({
      ok: true,
      message: `Busca concluída: ${results.length} vagas (${inserted} novas, ${updated} já existiam, ${scored} com calor analisado).`,
      count: results.length,
      inserted,
      updated,
      scored,
      jobs: results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[jobs/search] error', message);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  } finally {
    await provider.close();
  }
}
