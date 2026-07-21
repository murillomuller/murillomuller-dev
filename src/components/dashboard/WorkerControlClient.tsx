'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type WorkerStatus = {
  desiredEnabled: boolean;
  processRunning: boolean;
  activeCycle: boolean;
  label: string;
  startedAt: number | null;
  lastHeartbeat: number | null;
  nextRunAt: number | null;
  lastError: string | null;
  intervalMs: number;
  killSwitchActive: boolean;
  lastRun: {
    id: number;
    startedAt: number;
    endedAt: number | null;
    searched: number;
    scored: number;
    applied: number;
    needsReview: number;
    failed: number;
    skipped: number;
    message: string | null;
  } | null;
};

function formatDate(value: number | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function statusClass(status: WorkerStatus) {
  if (status.activeCycle) return 'border-blue-900/50 bg-blue-950/30 text-blue-200';
  if (status.processRunning && status.desiredEnabled) return 'border-green-900/50 bg-green-950/30 text-green-200';
  if (status.desiredEnabled) return 'border-yellow-900/50 bg-yellow-950/30 text-yellow-200';
  return 'border-[#333] bg-[#111] text-[#afafaf]';
}

export function WorkerControlClient({ initialStatus }: { initialStatus: WorkerStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  async function send(action: 'start' | 'stop' | 'run-now') {
    setLoadingAction(action);
    setFeedback(null);
    try {
      const res = await fetch('/api/jobs/worker-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!data.ok) {
        setFeedback({ ok: false, message: data.message || 'Falha ao controlar worker.' });
        return;
      }
      setStatus(data.status as WorkerStatus);
      setFeedback({
        ok: true,
        message:
          action === 'stop'
            ? 'Worker desligado pelo painel.'
            : action === 'run-now'
              ? 'Ciclo do worker solicitado agora.'
              : 'Worker ligado pelo painel.',
      });
      router.refresh();
    } catch (error: unknown) {
      setFeedback({ ok: false, message: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoadingAction(null);
    }
  }

  async function refreshStatus() {
    setLoadingAction('refresh');
    setFeedback(null);
    try {
      const res = await fetch('/api/jobs/worker-control');
      const data = await res.json();
      if (!data.ok) {
        setFeedback({ ok: false, message: data.message || 'Falha ao atualizar status.' });
        return;
      }
      setStatus(data.status as WorkerStatus);
    } catch (error: unknown) {
      setFeedback({ ok: false, message: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoadingAction(null);
    }
  }

  const busy = loadingAction != null;

  return (
    <div className="space-y-4 rounded-lg border border-[#2a2a2a] bg-[#171717] p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-[#747474]">Worker automático</p>
          <h2 className="text-xl font-semibold text-[#ededed]">Controle de busca de emprego</h2>
          <p className="mt-1 text-sm text-[#afafaf]">
            Liga/desliga o loop que busca vagas no LinkedIn e roda candidaturas conforme as preferências salvas.
          </p>
        </div>
        <span className={`rounded border px-3 py-1.5 text-sm font-semibold ${statusClass(status)}`}>
          {status.label}
        </span>
      </div>

      {status.killSwitchActive ? (
        <div className="rounded border border-yellow-900/50 bg-yellow-950/20 p-3 text-sm text-yellow-200">
          Kill-switch JOBS_AUTO_APPLY=false está ativo no ambiente. O painel salva o estado, mas o worker não executa ciclos até remover essa variável.
        </div>
      ) : null}

      <div className="grid gap-3 text-sm md:grid-cols-4">
        <div className="rounded border border-[#262626] bg-[#111] p-3">
          <p className="text-xs text-[#747474]">Processo</p>
          <p className="font-semibold text-[#ededed]">{status.processRunning ? 'ativo' : 'parado'}</p>
        </div>
        <div className="rounded border border-[#262626] bg-[#111] p-3">
          <p className="text-xs text-[#747474]">Ciclo atual</p>
          <p className="font-semibold text-[#ededed]">{status.activeCycle ? 'executando' : 'ocioso'}</p>
        </div>
        <div className="rounded border border-[#262626] bg-[#111] p-3">
          <p className="text-xs text-[#747474]">Próxima execução</p>
          <p className="font-semibold text-[#ededed]">{formatDate(status.nextRunAt)}</p>
        </div>
        <div className="rounded border border-[#262626] bg-[#111] p-3">
          <p className="text-xs text-[#747474]">Último heartbeat</p>
          <p className="font-semibold text-[#ededed]">{formatDate(status.lastHeartbeat)}</p>
        </div>
      </div>

      {status.lastRun ? (
        <div className="rounded border border-[#262626] bg-[#111] p-3 text-sm text-[#afafaf]">
          <p className="font-semibold text-[#ededed]">Último ciclo #{status.lastRun.id}</p>
          <p>
            {formatDate(status.lastRun.startedAt)} · buscadas {status.lastRun.searched} · analisadas {status.lastRun.scored} · aplicadas {status.lastRun.applied} · revisão {status.lastRun.needsReview} · falhas {status.lastRun.failed}
          </p>
          {status.lastRun.message ? <p className="mt-1 text-xs text-[#747474]">{status.lastRun.message}</p> : null}
        </div>
      ) : (
        <div className="rounded border border-[#262626] bg-[#111] p-3 text-sm text-[#747474]">
          Nenhum ciclo automático registrado ainda.
        </div>
      )}

      {status.lastError ? (
        <div className="rounded border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-300">
          Último erro do processo: {status.lastError}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || (status.desiredEnabled && status.processRunning)}
          onClick={() => void send('start')}
          className="rounded bg-green-700 px-4 py-2 font-semibold text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingAction === 'start' ? 'Ligando…' : 'Ligar worker'}
        </button>
        <button
          type="button"
          disabled={busy || (!status.desiredEnabled && !status.processRunning)}
          onClick={() => void send('stop')}
          className="rounded bg-[#da0037] px-4 py-2 font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingAction === 'stop' ? 'Desligando…' : 'Desligar worker'}
        </button>
        <button
          type="button"
          disabled={busy || status.activeCycle}
          onClick={() => void send('run-now')}
          className="rounded border border-[#444] px-4 py-2 font-semibold text-[#ededed] hover:border-[#666] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingAction === 'run-now' ? 'Solicitando…' : 'Rodar ciclo agora'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void refreshStatus()}
          className="rounded border border-[#333] px-4 py-2 font-semibold text-[#afafaf] hover:text-[#ededed] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Atualizar status
        </button>
      </div>

      {feedback ? (
        <p
          className={`rounded border px-3 py-2 text-sm ${
            feedback.ok
              ? 'border-green-900/50 bg-green-950/30 text-green-300'
              : 'border-red-900/50 bg-red-950/30 text-red-300'
          }`}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
