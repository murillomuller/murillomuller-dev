import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { applications, jobs } from '@/db/schema';
import {
  answerScreeningQuestions,
  type ScreeningField,
} from '@/jobs/ai/screening';
import { eq } from 'drizzle-orm';

export const maxDuration = 60;
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

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
  const locale = body.locale === 'pt-BR' ? 'pt-BR' : 'en';

  const job = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1).then((r) => r[0]);
  if (!job) {
    return NextResponse.json({ ok: false, message: 'Job not found' }, { status: 404 });
  }

  let fields: ScreeningField[] = Array.isArray(body.fields) ? body.fields : [];
  if (fields.length === 0) {
    const app = await db
      .select()
      .from(applications)
      .where(eq(applications.jobId, jobId))
      .limit(1)
      .then((r) => r[0]);
    if (app?.pendingFieldsJson) {
      try {
        fields = JSON.parse(app.pendingFieldsJson);
      } catch {
        fields = [];
      }
    }
  }

  if (fields.length === 0) {
    return NextResponse.json(
      { ok: false, message: 'Nenhum campo pendente para a IA preencher.' },
      { status: 400 }
    );
  }

  const answers = await answerScreeningQuestions({
    fields,
    job: {
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.descriptionFull || job.descriptionSummary || '',
    },
    locale,
    forceAll: true,
  });

  return NextResponse.json({
    ok: true,
    answers,
    message: `IA preencheu ${answers.length} campo(s). Revise e clique em Resolver e enviar.`,
  });
}
