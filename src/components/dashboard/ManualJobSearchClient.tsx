'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  JOB_KEYWORD_PRESETS,
  parseKeywordList,
  toggleKeyword,
} from '@/jobs/keyword-presets';

type FitInfo = {
  score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  recommendation: string;
};

type JobRow = {
  id: number;
  title: string;
  company: string;
  location: string;
  url: string;
  salaryText: string | null;
  source: string;
  status: string | null;
  matchScore: number | null;
  fitSummary: string | null;
  hasDetails?: boolean;
};

type JobDetails = {
  id: number;
  title: string;
  company: string;
  location: string;
  url: string;
  salaryText?: string | null;
  descriptionFull?: string;
  descriptionSummary?: string | null;
  benefits?: string[];
  postedAt?: string | null;
  easyApply?: boolean;
  matchScore?: number | null;
  fit?: FitInfo | null;
  status?: string | null;
};

function heatClass(score: number | null | undefined) {
  if (score == null) return 'bg-[#222] text-[#afafaf]';
  if (score >= 80) return 'bg-green-950/60 text-green-300';
  if (score >= 65) return 'bg-yellow-950/50 text-yellow-300';
  if (score >= 45) return 'bg-orange-950/50 text-orange-300';
  return 'bg-red-950/50 text-red-300';
}

function heatLabel(score: number | null | undefined) {
  if (score == null) return 'sem calor';
  return `${score}%`;
}

export function ManualJobSearchClient({
  initialJobs,
  defaultKeywords,
  defaultLocations,
  skillPresets = [],
}: {
  initialJobs: JobRow[];
  defaultKeywords: string;
  defaultLocations: string;
  skillPresets?: string[];
}) {
  const router = useRouter();
  const [keywords, setKeywords] = useState(defaultKeywords);
  const [locations, setLocations] = useState(defaultLocations);
  const [easyApplyOnly, setEasyApplyOnly] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [detailsLoadingId, setDetailsLoadingId] = useState<number | null>(null);
  const [details, setDetails] = useState<JobDetails | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyFeedback, setApplyFeedback] = useState<{
    ok: boolean;
    message: string;
    needsLocaleConfirmation?: boolean;
  } | null>(null);

  const selected = useMemo(() => parseKeywordList(keywords), [keywords]);
  const primary = selected[0] || '';

  const presets = useMemo(() => {
    const merged = [...JOB_KEYWORD_PRESETS, ...skillPresets.filter(Boolean)];
    const seen = new Set<string>();
    return merged.filter((p) => {
      const key = p.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [skillPresets]);

  async function persistPrefs(nextKeywords: string, nextLocations: string) {
    setSavingPrefs(true);
    try {
      await fetch('/api/jobs/prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: nextKeywords, locations: nextLocations }),
      });
    } catch {
      /* non-blocking */
    } finally {
      setSavingPrefs(false);
    }
  }

  function onTogglePreset(preset: string) {
    const next = toggleKeyword(keywords, preset);
    setKeywords(next);
    void persistPrefs(next, locations);
  }

  async function runSearch() {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, locations, limit: 15, easyApplyOnly }),
      });
      const data = await res.json();
      setFeedback({ ok: !!data.ok, message: data.message || (data.ok ? 'OK' : 'Falhou') });
      router.refresh();
    } catch (err: unknown) {
      setFeedback({
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  }

  async function openDetails(jobId: number) {
    setDetailsLoadingId(jobId);
    setDetailsError(null);
    setDetails(null);
    setApplyFeedback(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/details`);
      const data = await res.json();
      if (!data.ok) {
        setDetailsError(data.message || 'Falha ao importar detalhes');
        return;
      }
      setDetails(data.job as JobDetails);
      router.refresh();
    } catch (err: unknown) {
      setDetailsError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetailsLoadingId(null);
    }
  }

  async function applyToJob(jobId: number, locale?: 'en' | 'pt-BR') {
    setApplying(true);
    setApplyFeedback(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locale ? { locale } : {}),
      });
      const data = await res.json();
      setApplyFeedback({
        ok: !!data.ok || !!data.alreadyApplied,
        message: data.message || (data.ok ? 'Candidatura enviada.' : 'Falha ao aplicar'),
        needsLocaleConfirmation: !!data.needsLocaleConfirmation,
      });
      if (data.status) {
        setDetails((prev) => (prev ? { ...prev, status: data.status } : prev));
      }
      router.refresh();
    } catch (err: unknown) {
      setApplyFeedback({
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setApplying(false);
    }
  }

  const field =
    'w-full rounded border border-[#333] bg-[#131313] p-2.5 text-sm text-[#ededed] focus:border-[#da0037] focus:outline-none';

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-lg border border-[#2a2a2a] bg-[#171717] p-6">
        <h2 className="text-xl font-semibold">Busca manual (LinkedIn)</h2>
        <p className="text-sm text-[#afafaf]">
          Preferência: frontend / engineer. O primeiro keyword é o que o LinkedIn busca. Clique num
          chip para ativar (vai para a frente); clique no primário para remover. Keywords salvam
          sozinhos. Por padrão busca todas as vagas (não só Easy Apply).
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-[#afafaf]">
              Keywords {savingPrefs ? '(salvando…)' : ''}
            </label>
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              onBlur={() => void persistPrefs(keywords, locations)}
              disabled={loading}
              className={field}
              placeholder="Frontend Engineer, React, Next.js"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#afafaf]">Location</label>
            <input
              value={locations}
              onChange={(e) => setLocations(e.target.value)}
              onBlur={() => void persistPrefs(keywords, locations)}
              disabled={loading}
              className={field}
              placeholder="Brazil, Remote"
            />
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#afafaf]">
          <input
            type="checkbox"
            checked={easyApplyOnly}
            disabled={loading}
            onChange={(e) => setEasyApplyOnly(e.target.checked)}
            className="size-4 accent-[#da0037]"
          />
          Só Easy Apply
        </label>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-[#747474]">Padrões do perfil</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => {
              const activeIdx = selected.findIndex((k) => k.toLowerCase() === preset.toLowerCase());
              const isPrimary = activeIdx === 0;
              const isActive = activeIdx >= 0;
              return (
                <button
                  key={preset}
                  type="button"
                  disabled={loading}
                  onClick={() => onTogglePreset(preset)}
                  className={
                    isPrimary
                      ? 'rounded border border-[#da0037] bg-[#da0037]/20 px-3 py-1.5 text-xs font-semibold text-[#da0037]'
                      : isActive
                        ? 'rounded border border-[#444] bg-[#222] px-3 py-1.5 text-xs font-medium text-[#ededed]'
                        : 'rounded border border-[#333] bg-transparent px-3 py-1.5 text-xs text-[#afafaf] hover:border-[#555] hover:text-[#ededed]'
                  }
                >
                  {isPrimary ? `${preset} · busca` : preset}
                </button>
              );
            })}
          </div>
          {primary ? (
            <p className="text-xs text-[#747474]">
              LinkedIn vai buscar: <span className="text-[#ededed]">{primary}</span>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={runSearch}
          className="rounded bg-[#da0037] px-6 py-2.5 font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Buscando e analisando…' : 'Buscar vagas agora'}
        </button>
        {loading && (
          <p className="flex items-center gap-2 text-sm text-blue-300">
            <span className="inline-block size-4 animate-spin rounded-full border-2 border-blue-300 border-t-transparent" />
            Buscando no LinkedIn e avaliando fit com o CV (OpenAI)…
          </p>
        )}
        {feedback && (
          <p
            className={`rounded border px-3 py-2 text-sm ${
              feedback.ok
                ? 'border-green-900/50 bg-green-950/30 text-green-300'
                : 'border-red-900/50 bg-red-950/30 text-red-300'
            }`}
          >
            {feedback.message}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-[#ededed]">
          Vagas importadas ({initialJobs.length})
        </h2>
        {initialJobs.length === 0 ? (
          <div className="rounded-lg border border-[#2a2a2a] bg-[#171717] p-8 text-center text-[#afafaf]">
            Nenhuma vaga ainda. Rode uma busca manual.
          </div>
        ) : (
          initialJobs.map((job) => (
            <div
              key={job.id}
              className="gap-4 rounded-lg border border-[#2a2a2a] bg-[#171717] p-4 md:flex md:items-center md:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-bold text-[#ededed]">{job.title}</p>
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${heatClass(job.matchScore)}`}>
                    calor {heatLabel(job.matchScore)}
                  </span>
                </div>
                <p className="text-sm font-semibold text-[#da0037]">{job.company}</p>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-[#afafaf]">
                  <span>{job.location}</span>
                  {job.salaryText && <span>{job.salaryText}</span>}
                  <span className="rounded bg-[#222] px-2 py-0.5">
                    {job.status === 'awaiting_confirmation'
                      ? 'aguardando confirmação'
                      : job.status || 'discovered'}
                  </span>
                  {job.hasDetails && (
                    <span className="rounded bg-green-950/50 px-2 py-0.5 text-green-300">detalhes ok</span>
                  )}
                </div>
                {job.fitSummary && (
                  <p className="mt-2 line-clamp-2 text-xs text-[#afafaf]">{job.fitSummary}</p>
                )}
              </div>
              <div className="mt-3 flex shrink-0 flex-wrap gap-2 md:mt-0">
                <button
                  type="button"
                  disabled={detailsLoadingId === job.id}
                  onClick={() => openDetails(job.id)}
                  className="rounded bg-[#da0037] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {detailsLoadingId === job.id ? 'Analisando…' : 'Ver detalhes'}
                </button>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-[#333] px-4 py-2 text-sm hover:border-[#da0037]"
                >
                  LinkedIn
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {(details || detailsError || detailsLoadingId != null) && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={() => {
            if (detailsLoadingId == null) {
              setDetails(null);
              setDetailsError(null);
            }
          }}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-[#2a2a2a] bg-[#171717] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h3 className="text-xl font-bold text-[#da0037]">
                {details?.title || (detailsLoadingId != null ? 'Carregando detalhes…' : 'Detalhes')}
              </h3>
              <button
                type="button"
                className="text-sm text-[#afafaf] hover:text-white"
                onClick={() => {
                  setDetails(null);
                  setDetailsError(null);
                }}
              >
                Fechar
              </button>
            </div>

            {detailsLoadingId != null && !details && (
              <p className="flex items-center gap-2 text-sm text-blue-300">
                <span className="inline-block size-4 animate-spin rounded-full border-2 border-blue-300 border-t-transparent" />
                Importando descrição e avaliando calor vs currículo…
              </p>
            )}

            {detailsError && (
              <p className="rounded border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
                {detailsError}
              </p>
            )}

            {details && (
              <div className="space-y-4 text-sm text-[#ededed]">
                <div>
                  <p className="font-semibold text-[#da0037]">{details.company}</p>
                  <p className="text-[#afafaf]">{details.location}</p>
                  {details.postedAt && (
                    <p className="mt-1 text-xs text-[#747474]">Posted: {details.postedAt}</p>
                  )}
                  {details.easyApply != null && (
                    <p className="mt-1 text-xs">
                      Easy Apply:{' '}
                      <span className={details.easyApply ? 'text-green-400' : 'text-yellow-400'}>
                        {details.easyApply ? 'sim' : 'não'}
                      </span>
                    </p>
                  )}
                </div>

                <div className="rounded border border-[#2a2a2a] bg-[#131313] p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-[#afafaf]">Calor vs currículo</h4>
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${heatClass(details.matchScore)}`}>
                      {heatLabel(details.matchScore)}
                    </span>
                    {details.fit?.recommendation && (
                      <span className="rounded bg-[#222] px-2 py-0.5 text-xs text-[#afafaf]">
                        {details.fit.recommendation}
                      </span>
                    )}
                  </div>
                  {details.fit?.summary ? (
                    <p className="text-[#afafaf]">{details.fit.summary}</p>
                  ) : (
                    <p className="text-[#747474]">Análise ainda não disponível.</p>
                  )}
                  {details.fit?.strengths && details.fit.strengths.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1 text-xs font-semibold text-green-400">Pontos fortes</p>
                      <ul className="list-disc space-y-1 pl-5 text-xs text-[#afafaf]">
                        {details.fit.strengths.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {details.fit?.gaps && details.fit.gaps.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1 text-xs font-semibold text-orange-400">Lacunas</p>
                      <ul className="list-disc space-y-1 pl-5 text-xs text-[#afafaf]">
                        {details.fit.gaps.map((g) => (
                          <li key={g}>{g}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {details.salaryText && !/^R\$\s?0/i.test(details.salaryText) && (
                  <div>
                    <h4 className="mb-1 font-semibold text-[#afafaf]">Salário</h4>
                    <p>{details.salaryText}</p>
                  </div>
                )}

                {details.benefits && details.benefits.length > 0 && (
                  <div>
                    <h4 className="mb-1 font-semibold text-[#afafaf]">Benefícios / insights</h4>
                    <ul className="list-disc space-y-1 pl-5 text-[#afafaf]">
                      {details.benefits.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {details.descriptionSummary && (
                  <div>
                    <h4 className="mb-1 font-semibold text-[#afafaf]">Resumo</h4>
                    <p className="text-[#afafaf]">{details.descriptionSummary}</p>
                  </div>
                )}

                <div>
                  <h4 className="mb-1 font-semibold text-[#afafaf]">Descrição completa</h4>
                  <pre className="whitespace-pre-wrap rounded border border-[#2a2a2a] bg-[#131313] p-3 text-xs leading-relaxed text-[#afafaf]">
                    {details.descriptionFull || 'Sem descrição importada.'}
                  </pre>
                </div>

                <div className="sticky bottom-0 -mx-6 -mb-6 border-t border-[#2a2a2a] bg-[#171717] px-6 py-4">
                  {applyFeedback && (
                    <p
                      className={`mb-3 rounded border px-3 py-2 text-sm ${
                        applyFeedback.ok
                          ? 'border-green-900/50 bg-green-950/30 text-green-300'
                          : applyFeedback.needsLocaleConfirmation ||
                              details.status === 'awaiting_confirmation'
                            ? 'border-amber-900/50 bg-amber-950/30 text-amber-200'
                            : 'border-red-900/50 bg-red-950/30 text-red-300'
                      }`}
                    >
                      {applyFeedback.message}
                    </p>
                  )}
                  {(details.status === 'awaiting_confirmation' ||
                    applyFeedback?.needsLocaleConfirmation) && (
                    <div className="mb-3 space-y-2 rounded border border-amber-900/40 bg-amber-950/20 p-3">
                      <p className="text-sm text-amber-100">
                        Idioma da vaga ambíguo — escolha o currículo para continuar:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={applying}
                          onClick={() => applyToJob(details.id, 'en')}
                          className="rounded border border-amber-700/60 bg-amber-950/40 px-4 py-2 text-sm font-semibold text-amber-100 hover:border-amber-500 disabled:opacity-50"
                        >
                          {applying ? 'Aplicando…' : 'CV em inglês'}
                        </button>
                        <button
                          type="button"
                          disabled={applying}
                          onClick={() => applyToJob(details.id, 'pt-BR')}
                          className="rounded border border-amber-700/60 bg-amber-950/40 px-4 py-2 text-sm font-semibold text-amber-100 hover:border-amber-500 disabled:opacity-50"
                        >
                          {applying ? 'Aplicando…' : 'CV em português'}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={
                        applying ||
                        details.status === 'applied_auto' ||
                        details.status === 'applied_manual' ||
                        details.status === 'applying' ||
                        details.status === 'awaiting_confirmation'
                      }
                      onClick={() => applyToJob(details.id)}
                      className="rounded bg-[#da0037] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {applying
                        ? 'Aplicando…'
                        : details.status === 'applied_auto' || details.status === 'applied_manual'
                          ? 'Já aplicada'
                          : details.status === 'applying'
                            ? 'Em andamento…'
                            : details.status === 'awaiting_confirmation'
                              ? 'Aguardando confirmação'
                              : 'Aplicar à vaga'}
                    </button>
                    <a
                      href={details.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded border border-[#333] px-5 py-2.5 text-sm font-semibold text-[#ededed] hover:border-[#da0037]"
                    >
                      Abrir no LinkedIn
                    </a>
                  </div>
                  {details.easyApply === false && (
                    <p className="mt-2 text-xs text-yellow-400">
                      Esta vaga não tem Easy Apply — o sistema tentará aplicar via IA no site externo.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
