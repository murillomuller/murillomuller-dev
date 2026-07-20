import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { applications, jobs } from '@/db/schema';
import { learnMany, seedScreeningMemoryDefaults } from '@/jobs/ai/screening-memory';
import { applyToJobById } from '@/jobs/apply/apply-job';
import { eq } from 'drizzle-orm';

export const maxDuration = 180;
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

type AnswerIn = { id?: string; label?: string; value: string; kind?: string; options?: string[] };

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

  const body = await req.json().catch(() => ({}));
  const answers = Array.isArray(body.answers) ? (body.answers as AnswerIn[]) : [];
  const locale = body.locale === 'pt-BR' ? 'pt-BR' : 'en';

  if (answers.length === 0 || answers.every((a) => !String(a.value || '').trim())) {
    return NextResponse.json(
      { ok: false, message: 'Preencha pelo menos uma resposta no painel.' },
      { status: 400 }
    );
  }

  const job = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1).then((r) => r[0]);
  if (!job) {
    return NextResponse.json({ ok: false, message: 'Job not found' }, { status: 404 });
  }

  const app = await db
    .select()
    .from(applications)
    .where(eq(applications.jobId, jobId))
    .limit(1)
    .then((r) => r[0]);
  if (!app) {
    return NextResponse.json({ ok: false, message: 'Application not found' }, { status: 404 });
  }

  await seedScreeningMemoryDefaults();

  await learnMany(
    answers
      .filter((a) => a.label && a.value)
      .map((a) => ({
        label: String(a.label),
        answer: String(a.value),
        kind: a.kind,
        options: a.options,
      })),
    'user'
  );

  const result = await applyToJobById(jobId, locale, answers.map((a) => ({
    id: a.id,
    label: a.label,
    value: String(a.value),
  })));

  if (!result.ok) {
    // preserve pendingError behavior
    await db
      .update(applications)
      .set({ status: 'needs_review', pendingError: result.message, updatedAt: Date.now() })
      .where(eq(applications.id, app.id));
  }

  return NextResponse.json({
    ok: result.ok,
    status: result.status,
    message: result.ok
      ? 'Candidatura enviada. Respostas salvas para próximas vagas.'
      : result.status === 'needs_review'
        ? 'Ainda faltam campos — ajuste as respostas e tente de novo.'
        : result.message || 'Falha ao retomar o Easy Apply.',
    pendingFields: result.pendingFields || [],
    learned: answers.length,
  }, { status: result.status === 'failed' && result.message !== 'Job not found' ? 500 : 200 });
}
