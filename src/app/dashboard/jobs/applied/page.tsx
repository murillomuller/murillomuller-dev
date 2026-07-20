import { db } from '@/db';
import { applications, jobs } from '@/db/schema';
import { listUnlockCareerSubmitted } from '@/jobs/providers/unlockcareer';
import { desc, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

const APPLIED_STATUSES = ['applied_auto', 'applied_manual'] as const;

function statusLabel(status: string) {
  if (status === 'applied_auto') return 'auto';
  if (status === 'applied_manual') return 'manual';
  if (status === 'submitted') return 'enviada';
  return status;
}

export default async function AppliedJobsPage() {
  const linkedInApplied = await db
    .select({
      id: applications.id,
      status: applications.status,
      matchScore: applications.matchScore,
      updatedAt: applications.updatedAt,
      title: jobs.title,
      company: jobs.company,
      location: jobs.location,
      url: jobs.url,
      source: jobs.source,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(inArray(applications.status, [...APPLIED_STATUSES]))
    .orderBy(desc(applications.updatedAt));

  const unlockSubmitted = listUnlockCareerSubmitted();

  async function markSkipped(formData: FormData) {
    'use server';
    const id = Number(formData.get('appId'));
    if (!id) return;
    await db
      .update(applications)
      .set({ status: 'skipped', updatedAt: Date.now() })
      .where(eq(applications.id, id));
    revalidatePath('/dashboard/jobs/applied');
  }

  const total = linkedInApplied.length + unlockSubmitted.length;

  return (
    <div className="space-y-6">
      <p className="text-sm text-[#afafaf]">
        {total === 0
          ? 'Nenhuma candidatura enviada ainda.'
          : `${total} candidatura${total === 1 ? '' : 's'} enviada${total === 1 ? '' : 's'}.`}
      </p>

      {unlockSubmitted.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#747474]">
            Unlock Career
          </h2>
          <div className="space-y-3">
            {unlockSubmitted.map((app) => (
              <article
                key={app.job.id}
                className="rounded-lg border border-[#2a2a2a] bg-[#171717] p-5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-[#ededed]">
                      <a
                        href={app.job.url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-[#da0037] hover:underline"
                      >
                        {app.job.title}
                      </a>
                    </h3>
                    <p className="text-sm font-semibold text-[#da0037]">{app.job.company}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#afafaf]">
                      <span className="rounded bg-[#222] px-2 py-0.5 text-[#ededed]">
                        {statusLabel(app.status)}
                      </span>
                      {app.submittedAt && (
                        <span>{new Date(app.submittedAt).toLocaleString('pt-BR')}</span>
                      )}
                      {app.job.compensation && <span>{app.job.compensation}</span>}
                    </div>
                  </div>
                  <a
                    href={app.job.url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded border border-[#333] bg-[#222] px-4 py-2 text-center text-sm font-semibold text-[#ededed] hover:border-[#da0037]"
                  >
                    Abrir vaga
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#747474]">LinkedIn</h2>
        {linkedInApplied.length === 0 ? (
          <div className="rounded-lg border border-[#2a2a2a] bg-[#171717] p-8 text-center text-[#afafaf]">
            Nenhuma aplicação LinkedIn marcada como enviada.
          </div>
        ) : (
          <div className="space-y-3">
            {linkedInApplied.map((app) => (
              <article
                key={app.id}
                className="rounded-lg border border-[#2a2a2a] bg-[#171717] p-5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-[#ededed]">
                      <a
                        href={app.url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-[#da0037] hover:underline"
                      >
                        {app.title}
                      </a>
                    </h3>
                    <p className="text-sm font-semibold text-[#da0037]">{app.company}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#afafaf]">
                      <span className="rounded bg-green-950/50 px-2 py-0.5 text-green-300">
                        {statusLabel(app.status)}
                      </span>
                      {app.matchScore != null && <span>Match {app.matchScore}%</span>}
                      <span>{app.location}</span>
                      {app.updatedAt && (
                        <span>{new Date(app.updatedAt).toLocaleString('pt-BR')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <a
                      href={app.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded border border-[#333] bg-[#222] px-4 py-2 text-center text-sm font-semibold text-[#ededed] hover:border-[#da0037]"
                    >
                      Abrir vaga
                    </a>
                    <form action={markSkipped}>
                      <input type="hidden" name="appId" value={app.id} />
                      <button
                        type="submit"
                        className="w-full rounded border border-[#333] px-4 py-2 text-sm text-[#afafaf] hover:border-[#da0037] hover:text-[#da0037]"
                      >
                        Remover da lista
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
