import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { applications, jobs } from '@/db/schema';
import { ensureJobFitScore, parseFitReasons } from '@/jobs/ai/matcher';
import { LinkedInProvider } from '@/jobs/providers/linkedin';
import { eq } from 'drizzle-orm';

export const maxDuration = 120;
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

async function loadFit(jobId: number) {
  const app = await db
    .select()
    .from(applications)
    .where(eq(applications.jobId, jobId))
    .limit(1)
    .then((r) => r[0]);
  if (!app) return null;
  return {
    matchScore: app.matchScore,
    matchReasons: parseFitReasons(app.matchReasons),
    status: app.status,
  };
}

export async function GET(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const jobId = Number(id);
  if (!jobId) return NextResponse.json({ ok: false, message: 'Invalid id' }, { status: 400 });

  const job = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1).then((r) => r[0]);
  if (!job) return NextResponse.json({ ok: false, message: 'Job not found' }, { status: 404 });

  // Only use cache when we actually have a real description
  const hasRealDescription = !!(job.descriptionFull && job.descriptionFull.length > 80);

  if (hasRealDescription) {
    let benefits: string[] = [];
    try {
      benefits = job.benefitsJson ? (JSON.parse(job.benefitsJson) as string[]) : [];
    } catch {
      benefits = [];
    }

    // Score vs CV if still missing (uses full description now)
    try {
      await ensureJobFitScore(jobId);
    } catch (err) {
      console.error('[jobs/details] fit score failed', err);
    }
    const fit = await loadFit(jobId);

    let easyApply: boolean | undefined;
    try {
      const raw = job.rawJson ? (JSON.parse(job.rawJson) as { easyApply?: boolean }) : null;
      if (typeof raw?.easyApply === 'boolean') easyApply = raw.easyApply;
    } catch {
      /* ignore */
    }

    return NextResponse.json({
      ok: true,
      cached: true,
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        url: job.url,
        salaryText: job.salaryText,
        descriptionFull: job.descriptionFull,
        descriptionSummary: job.descriptionSummary,
        benefits,
        postedAt: job.postedAt,
        easyApply,
        matchScore: fit?.matchScore ?? null,
        fit: fit?.matchReasons ?? null,
        status: fit?.status ?? null,
      },
    });
  }

  const provider = new LinkedInProvider();
  try {
    const details = await provider.fetchDetails(job.url);
    const salaryText =
      details.salaryText && !/^R\$\s?0(?:[.,]0+)?$/i.test(details.salaryText.replace(/\s/g, ''))
        ? details.salaryText
        : null;

    if (!details.descriptionFull || details.descriptionFull.length < 40) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'Não consegui importar a descrição dessa vaga no LinkedIn. Tente de novo em alguns segundos.',
          job: {
            id: job.id,
            title: details.title || job.title,
            company: details.company || job.company,
            url: job.url,
            easyApply: details.easyApply,
          },
        },
        { status: 502 }
      );
    }

    await db
      .update(jobs)
      .set({
        title: details.title || job.title,
        company: details.company || job.company,
        location: details.location || job.location,
        salaryText: salaryText ?? null,
        descriptionFull: details.descriptionFull,
        descriptionSummary: details.descriptionSummary ?? job.descriptionSummary,
        benefitsJson: JSON.stringify(details.benefits || []),
        postedAt: details.postedAt ?? job.postedAt,
        rawJson: JSON.stringify(details.raw || {}),
      })
      .where(eq(jobs.id, job.id));

    // Re-score with full description (upgrade thin title-only scores)
    try {
      await ensureJobFitScore(jobId, { force: true });
    } catch (err) {
      console.error('[jobs/details] fit score failed', err);
    }
    const fit = await loadFit(jobId);

    return NextResponse.json({
      ok: true,
      cached: false,
      job: {
        id: job.id,
        title: details.title || job.title,
        company: details.company || job.company,
        location: details.location || job.location,
        url: job.url,
        salaryText,
        descriptionFull: details.descriptionFull,
        descriptionSummary: details.descriptionSummary,
        benefits: details.benefits,
        postedAt: details.postedAt,
        easyApply: details.easyApply,
        matchScore: fit?.matchScore ?? null,
        fit: fit?.matchReasons ?? null,
        status: fit?.status ?? null,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[jobs/details]', message);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  } finally {
    await provider.close();
  }
}
