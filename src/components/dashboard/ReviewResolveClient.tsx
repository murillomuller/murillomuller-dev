'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export type PendingField = {
  id: string;
  kind: 'text' | 'number' | 'textarea' | 'select' | 'radio' | 'checkbox';
  label: string;
  required?: boolean;
  options?: string[];
  currentValue?: string;
};

type ReviewItem = {
  id: number;
  jobId: number;
  status: string;
  matchScore: number | null;
  title: string;
  company: string;
  url: string;
  location: string;
  pendingError: string | null;
  pendingFields: PendingField[];
  logHints: string[];
};

const ENGLISH_DEFAULTS = [
  'Professional',
  'Native or bilingual',
  'Conversational',
  'None',
  'Professional working proficiency',
  'Full professional proficiency',
  'Native or bilingual proficiency',
  'Limited working proficiency',
  'Elementary proficiency',
  'Upper Intermediate (B2)',
  'Advanced (C1+)',
];

function guessDefault(field: PendingField): string {
  const label = field.label.toLowerCase();
  const opts = (field.options || []).filter(
    (o) => o && !/^(select|selecione|none|selecionar)/i.test(o.trim())
  );

  if (/english|ingl[eê]s|proficiency in english/i.test(label)) {
    return (
      opts.find((o) => /^professional$/i.test(o.trim())) ||
      opts.find((o) => /professional working|b2|advanced/i.test(o)) ||
      'Professional'
    );
  }
  if (/years|anos|how many/i.test(label)) {
    if (/sanity/i.test(label)) return '0';
    if (/react(\.?js)?/i.test(label) && !/native/i.test(label)) return '8';
    if (/next\.?js/i.test(label)) return '5';
    if (/tailwind/i.test(label)) return '1';
    if (/redux/i.test(label)) return '5';
    if (/production|web application|professional experience developing/i.test(label)) return '10';
    return '5';
  }
  if (
    /page router|getserversideprops|getstaticprops|api routes|dynamic routes|javascript and react|start immediately|available immediately/i.test(
      label
    )
  ) {
    return opts.find((o) => /^(yes|sim)$/i.test(o.trim())) || 'Yes';
  }
  if (/brazil|brasil|country|pa[ií]s|city|cidade|localiza|where.*live/i.test(label)) {
    if (/city|cidade/i.test(label)) return 'Londrina';
    if (/country|pa[ií]s/i.test(label)) return 'Brazil';
    return 'Londrina, Paraná, Brazil';
  }
  if (/remote|remoto|híbrid|hybrid/i.test(label) && opts.length) {
    return opts.find((o) => /yes|sim|remote/i.test(o)) || opts[0] || '';
  }
  const cur = field.currentValue || '';
  if (cur && !/^(select|selecione|none)/i.test(cur)) return cur;
  return '';
}

export function ReviewResolveClient({ items }: { items: ReviewItem[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, Record<string, string>>>(() => {
    const init: Record<string, Record<string, string>> = {};
    for (const item of items) {
      init[String(item.jobId)] = {};
      for (const f of item.pendingFields) {
        init[String(item.jobId)][f.id] = guessDefault(f);
      }
    }
    return init;
  });
  const [busyJobId, setBusyJobId] = useState<number | null>(null);
  const [aiBusyJobId, setAiBusyJobId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Record<string, { ok: boolean; message: string }>>({});

  const englishOptionsFor = (field: PendingField) => {
    if (field.options?.length) return field.options;
    if (/english|ingl[eê]s|proficiency/i.test(field.label)) return ENGLISH_DEFAULTS;
    return [];
  };

  async function fillWithAi(item: ReviewItem) {
    const fields =
      item.pendingFields.length > 0
        ? item.pendingFields
        : [
            {
              id: 'english',
              kind: 'select' as const,
              label: 'What is your level of proficiency in English?',
              required: true,
              options: ENGLISH_DEFAULTS,
            },
          ];

    setAiBusyJobId(item.jobId);
    setFeedback((prev) => {
      const next = { ...prev };
      delete next[item.jobId];
      return next;
    });

    try {
      const res = await fetch(`/api/jobs/${item.jobId}/screen-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields, locale: 'en' }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setFeedback((prev) => ({
          ...prev,
          [item.jobId]: {
            ok: false,
            message: data.message || 'Falha ao chamar a IA',
          },
        }));
        return;
      }

      const answers = Array.isArray(data.answers) ? data.answers : [];
      setValues((prev) => {
        const jobMap = { ...(prev[String(item.jobId)] || {}) };
        for (const a of answers) {
          if (a?.id != null && a.value != null && String(a.value).trim() !== '') {
            jobMap[a.id] = String(a.value);
          }
        }
        return { ...prev, [String(item.jobId)]: jobMap };
      });

      setFeedback((prev) => ({
        ...prev,
        [item.jobId]: {
          ok: true,
          message: data.message || `IA preencheu ${answers.length} campo(s). Revise e envie.`,
        },
      }));
    } catch (err: unknown) {
      setFeedback((prev) => ({
        ...prev,
        [item.jobId]: {
          ok: false,
          message: err instanceof Error ? err.message : String(err),
        },
      }));
    } finally {
      setAiBusyJobId(null);
    }
  }

  async function resolveJob(item: ReviewItem) {
    setBusyJobId(item.jobId);
    setFeedback((prev) => {
      const next = { ...prev };
      delete next[item.jobId];
      return next;
    });
    const map = values[String(item.jobId)] || {};
    const answers = item.pendingFields.map((f) => ({
      id: f.id,
      label: f.label,
      value: map[f.id] || '',
      kind: f.kind,
      options: f.options,
    }));

    // If no pending fields captured, still send English default so memory learns
    if (answers.length === 0) {
      answers.push({
        id: 'english',
        label: 'What is your level of proficiency in English?',
        value: map.english || 'Professional working proficiency',
        kind: 'select',
        options: ENGLISH_DEFAULTS,
      });
    }

    try {
      const res = await fetch(`/api/jobs/${item.jobId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, locale: 'en' }),
      });
      const data = await res.json();
      setFeedback((prev) => ({
        ...prev,
        [item.jobId]: {
          ok: !!data.ok,
          message: data.message || (data.ok ? 'Enviado' : 'Falhou'),
        },
      }));
      router.refresh();
    } catch (err: unknown) {
      setFeedback((prev) => ({
        ...prev,
        [item.jobId]: {
          ok: false,
          message: err instanceof Error ? err.message : String(err),
        },
      }));
    } finally {
      setBusyJobId(null);
    }
  }

  async function markStatus(appId: number, status: string) {
    const res = await fetch('/api/jobs/review-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId, status }),
    });
    if (res.ok) router.refresh();
  }

  const empty = items.length === 0;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#2a2a2a] bg-[#171717] p-4 text-sm text-[#afafaf]">
        Use <strong className="text-[#ededed]">Preencher com IA</strong> para sugerir respostas
        pelo currículo, revise, e clique em{' '}
        <strong className="text-[#ededed]">Resolver e enviar</strong>. As respostas ficam salvas
        para as próximas vagas.
      </div>

      {empty ? (
        <div className="rounded-lg border border-[#2a2a2a] bg-[#171717] p-8 text-center text-[#afafaf]">
          Nada na fila de revisão.
        </div>
      ) : (
        items.map((item) => {
          const fields =
            item.pendingFields.length > 0
              ? item.pendingFields
              : [
                  {
                    id: 'english',
                    kind: 'select' as const,
                    label: 'What is your level of proficiency in English?',
                    required: true,
                    options: ENGLISH_DEFAULTS,
                  },
                ];
          const fb = feedback[item.jobId];
          const busy = busyJobId === item.jobId;
          const aiBusy = aiBusyJobId === item.jobId;
          const locked = busy || aiBusy;

          return (
            <article
              key={item.id}
              className="space-y-4 rounded-lg border border-[#2a2a2a] bg-[#171717] p-6"
            >
              <div>
                <h3 className="text-lg font-bold text-[#ededed]">{item.title}</h3>
                <p className="text-sm font-semibold text-[#da0037]">{item.company}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#afafaf]">
                  <span className="rounded bg-yellow-700 px-2 py-0.5 text-white">
                    {item.status === 'needs_review' ? 'precisa resolver' : item.status}
                  </span>
                  <span>{item.location}</span>
                  {item.matchScore != null && <span>Match {item.matchScore}%</span>}
                </div>
                {item.pendingError && (
                  <p className="mt-2 text-sm text-amber-200">{item.pendingError}</p>
                )}
              </div>

              <div className="space-y-3">
                {fields.map((f) => {
                  const opts = englishOptionsFor(f);
                  const val = values[String(item.jobId)]?.[f.id] || '';
                  return (
                    <div key={f.id}>
                      <label className="mb-1 block text-sm text-[#afafaf]">
                        {f.label}
                        {f.required ? ' *' : ''}
                      </label>
                      {opts.length > 0 || f.kind === 'select' || f.kind === 'radio' ? (
                        <select
                          value={val}
                          disabled={locked}
                          onChange={(e) =>
                            setValues((prev) => ({
                              ...prev,
                              [String(item.jobId)]: {
                                ...(prev[String(item.jobId)] || {}),
                                [f.id]: e.target.value,
                              },
                            }))
                          }
                          className="w-full rounded border border-[#333] bg-[#131313] p-2.5 text-sm text-[#ededed]"
                        >
                          <option value="">Selecione…</option>
                          {(opts.length ? opts : ENGLISH_DEFAULTS).map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      ) : f.kind === 'textarea' ? (
                        <textarea
                          value={val}
                          disabled={locked}
                          rows={4}
                          onChange={(e) =>
                            setValues((prev) => ({
                              ...prev,
                              [String(item.jobId)]: {
                                ...(prev[String(item.jobId)] || {}),
                                [f.id]: e.target.value,
                              },
                            }))
                          }
                          className="w-full rounded border border-[#333] bg-[#131313] p-2.5 text-sm text-[#ededed]"
                        />
                      ) : (
                        <input
                          value={val}
                          disabled={locked}
                          onChange={(e) =>
                            setValues((prev) => ({
                              ...prev,
                              [String(item.jobId)]: {
                                ...(prev[String(item.jobId)] || {}),
                                [f.id]: e.target.value,
                              },
                            }))
                          }
                          className="w-full rounded border border-[#333] bg-[#131313] p-2.5 text-sm text-[#ededed]"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => fillWithAi(item)}
                  className="rounded border border-[#da0037]/60 bg-[#da0037]/15 px-4 py-2.5 text-sm font-bold text-[#ff6b8a] hover:bg-[#da0037]/25 disabled:opacity-50"
                >
                  {aiBusy ? 'IA preenchendo…' : 'Preencher com IA'}
                </button>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => resolveJob(item)}
                  className="rounded bg-[#da0037] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? 'Enviando e aprendendo…' : 'Resolver e enviar'}
                </button>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => markStatus(item.id, 'applied_manual')}
                  className="rounded border border-green-800 bg-green-950/30 px-4 py-2.5 text-sm text-green-300"
                >
                  Já enviei fora
                </button>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => markStatus(item.id, 'skipped')}
                  className="rounded border border-[#333] px-4 py-2.5 text-sm text-[#afafaf]"
                >
                  Descartar
                </button>
              </div>

              {fb && (
                <p
                  className={`text-sm ${fb.ok ? 'text-green-300' : 'text-amber-200'}`}
                >
                  {fb.message}
                </p>
              )}

              {item.logHints.length > 0 && (
                <details className="text-xs text-[#747474]">
                  <summary className="cursor-pointer">Log recente</summary>
                  <ul className="mt-2 space-y-1 pl-3">
                    {item.logHints.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </details>
              )}
            </article>
          );
        })
      )}
    </div>
  );
}
