import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import type { JobCvLocale } from '@/jobs/ai/detect-job-language';
import { applyToJobById } from '@/jobs/apply/apply-job';

export const maxDuration = 180;
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

function parseForcedLocale(body: unknown): JobCvLocale | null {
  if (!body || typeof body !== 'object') return null;
  const locale = (body as { locale?: unknown }).locale;
  if (locale === 'en' || locale === 'pt-BR') return locale;
  return null;
}

export async function POST(req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const jobId = Number(id);
  if (!jobId) {
    return NextResponse.json({ ok: false, message: 'Invalid id' }, { status: 400 });
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const forcedLocale = parseForcedLocale(body);

  const result = await applyToJobById(jobId, forcedLocale);

  return NextResponse.json(result, { status: result.status === 'failed' && result.message !== 'Job not found' ? 500 : (result.message === 'Job not found' ? 404 : 200) });
}
