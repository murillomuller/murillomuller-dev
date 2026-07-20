import { db } from '@/db';
import { applications, applyLogs, jobs } from '@/db/schema';
import { detectJobCvLocale, type JobCvLocale } from '@/jobs/ai/detect-job-language';
import { LinkedInProvider } from '@/jobs/providers/linkedin';
import { writePersonalizedCvPdf } from '@/lib/cv/generate-pdf';
import { eq } from 'drizzle-orm';
import type { ApplyResult } from '@/jobs/providers/types';

export interface ApplyJobResult {
  ok: boolean;
  status: string;
  message: string;
  url?: string;
  cvPath?: string;
  locale?: string;
  alreadyApplied?: boolean;
  needsLocaleConfirmation?: boolean;
  detection?: {
    confidence: string;
    enScore: number;
    ptScore: number;
  };
  pendingFields?: ApplyResult['pendingFields'];
  logs?: ApplyResult['logs'];
}

export async function applyToJobById(jobId: number, forcedLocale?: JobCvLocale | null, forcedAnswers?: Array<{ id?: string; label?: string; value: string }>): Promise<ApplyJobResult> {
  const job = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1)
    .then((r) => r[0]);

  if (!job) {
    return { ok: false, status: 'failed', message: 'Job not found' };
  }

  let app = await db
    .select()
    .from(applications)
    .where(eq(applications.jobId, jobId))
    .limit(1)
    .then((r) => r[0]);

  if (!app) {
    const [inserted] = await db
      .insert(applications)
      .values({
        jobId,
        status: 'matched',
        updatedAt: Date.now(),
      })
      .returning();
    app = inserted;
  }

  if (['applied_auto', 'applied_manual'].includes(app.status)) {
    return {
      ok: true,
      alreadyApplied: true,
      status: app.status,
      message: 'Já marcada como aplicada.',
    };
  }

  const description = job.descriptionFull || job.descriptionSummary || '';
  const detection = detectJobCvLocale({
    title: job.title,
    description,
  });
  const locale = forcedLocale ?? detection.locale;

  if (!locale) {
    await db
      .update(applications)
      .set({ status: 'awaiting_confirmation', updatedAt: Date.now() })
      .where(eq(applications.id, app.id));

    await db.insert(applyLogs).values({
      applicationId: app.id,
      step: 'locale_detect',
      level: 'warn',
      message: `Idioma ambíguo (en=${detection.enScore.toFixed(1)}, pt=${detection.ptScore.toFixed(1)}). Aguardando confirmação manual.`,
    });

    return {
      ok: false,
      status: 'awaiting_confirmation',
      needsLocaleConfirmation: true,
      message: 'Idioma da vaga ambíguo. Confirme se o currículo deve ser em inglês ou português antes de aplicar.',
      url: job.url,
      detection: {
        confidence: detection.confidence,
        enScore: detection.enScore,
        ptScore: detection.ptScore,
      },
    };
  }

  await db
    .update(applications)
    .set({
      status: 'applying',
      attemptCount: (app.attemptCount || 0) + 1,
      updatedAt: Date.now(),
    })
    .where(eq(applications.id, app.id));

  const provider = new LinkedInProvider();
  try {
    const canAutoApply = await provider.canAutoApply();
    if (!canAutoApply) {
      await db
        .update(applications)
        .set({ status: 'needs_review', updatedAt: Date.now() })
        .where(eq(applications.id, app.id));
      return {
        ok: false,
        status: 'needs_review',
        message: 'Auto-apply indisponível. Abra no LinkedIn e candidate-se manualmente.',
        url: job.url,
      };
    }

    const cvPath = await writePersonalizedCvPdf({
      locale,
      jobId,
    });

    await db
      .update(applications)
      .set({ adaptedCvPath: cvPath, updatedAt: Date.now() })
      .where(eq(applications.id, app.id));

    const result = await provider.apply(job, {
      cvPath,
      coverLetter: app.coverLetter || '',
      profile: {},
      jobTitle: job.title,
      company: job.company,
      location: job.location,
      description,
      locale,
      forcedAnswers,
    });

    await db
      .update(applications)
      .set({
        status: result.status,
        pendingError: result.error || null,
        pendingFieldsJson: result.pendingFields ? JSON.stringify(result.pendingFields) : null,
        updatedAt: Date.now(),
      })
      .where(eq(applications.id, app.id));

    if (result.logs?.length) {
      for (const log of result.logs) {
        await db.insert(applyLogs).values({
          applicationId: app.id,
          step: log.step,
          level: log.level,
          message: log.message,
          screenshotPath: log.screenshotPath,
          htmlSnapshotPath: log.htmlSnapshotPath,
        });
      }
    }

    return {
      ok: result.success,
      status: result.status,
      message: result.success
        ? `Candidatura enviada (Easy Apply) com currículo ${locale === 'en' ? 'em inglês' : 'em português'}.`
        : result.status === 'needs_review'
          ? 'Faltam respostas — abra a aba Revisar e complete no painel.'
          : result.error || 'Não foi possível concluir a candidatura automática.',
      url: job.url,
      cvPath,
      locale,
      pendingFields: result.pendingFields || [],
      logs: result.logs?.map((l) => ({ step: l.step, level: l.level, message: l.message })),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(applications)
      .set({ status: 'failed', updatedAt: Date.now() })
      .where(eq(applications.id, app.id));

    await db.insert(applyLogs).values({
      applicationId: app.id,
      step: 'apply_api',
      level: 'error',
      message,
    });

    return {
      ok: false,
      status: 'failed',
      message,
      url: job.url,
    };
  } finally {
    await provider.close();
  }
}
