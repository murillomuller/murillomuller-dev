'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

type Feedback = { ok: boolean; message: string } | null;

export function LinkedInConnectClient({
  connected,
  fileExists,
  lastValidated,
  statePath,
}: {
  connected: boolean;
  fileExists: boolean;
  lastValidated: string | null;
  statePath: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function callApi(body: Record<string, unknown>, waitingMsg: string) {
    setFeedback(null);
    setStatusText(waitingMsg);
    setLoadingAction(String(body.action));
    try {
      const res = await fetch('/api/jobs/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok: boolean; message: string };
      setFeedback({ ok: data.ok, message: data.message || (data.ok ? 'OK' : 'Falhou') });
      startTransition(() => router.refresh());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setFeedback({ ok: false, message });
    } finally {
      setLoadingAction(null);
      setStatusText(null);
    }
  }

  const field =
    'w-full rounded border border-[#333] bg-[#131313] p-2.5 text-sm text-[#ededed] placeholder:text-[#747474] focus:border-[#da0037] focus:outline-none';
  const label = 'mb-1 block text-sm text-[#afafaf]';
  const card = 'rounded-lg border border-[#2a2a2a] bg-[#171717] p-6';
  const busy = !!loadingAction || pending;

  return (
    <div className="space-y-8">
      <div
        className={`${card} flex flex-wrap items-center justify-between gap-4 ${
          connected ? 'border-green-900/50' : 'border-yellow-900/40'
        }`}
      >
        <div>
          <p className="text-lg font-semibold">
            Status:{' '}
            <span className={connected ? 'text-green-400' : 'text-yellow-400'}>
              {connected ? 'Conectado' : 'Desconectado'}
            </span>
          </p>
          {lastValidated && (
            <p className="mt-1 text-xs text-[#747474]">Última validação: {lastValidated}</p>
          )}
          <p className="mt-1 text-xs text-[#747474]">Arquivo: {statePath}</p>
        </div>
        <div className="flex gap-2">
          {fileExists && (
            <button
              type="button"
              disabled={busy}
              onClick={() => callApi({ action: 'validate' }, 'Validando sessão...')}
              className="rounded border border-[#333] px-4 py-2 text-sm hover:border-[#da0037] disabled:opacity-50"
            >
              Validar sessão
            </button>
          )}
          {fileExists && (
            <button
              type="button"
              disabled={busy}
              onClick={() => callApi({ action: 'disconnect' }, 'Desconectando...')}
              className="rounded border border-[#da0037] px-4 py-2 text-sm text-[#da0037] hover:bg-[#da0037] hover:text-white disabled:opacity-50"
            >
              Desconectar
            </button>
          )}
        </div>
      </div>

      {(statusText || feedback) && (
        <div
          className={`rounded border px-4 py-3 text-sm ${
            statusText
              ? 'border-blue-900/50 bg-blue-950/30 text-blue-200'
              : feedback?.ok
                ? 'border-green-900/50 bg-green-950/30 text-green-300'
                : 'border-red-900/50 bg-red-950/30 text-red-300'
          }`}
        >
          {statusText ? (
            <div className="flex items-center gap-3">
              <span className="inline-block size-4 animate-spin rounded-full border-2 border-blue-300 border-t-transparent" />
              <span>{statusText}</span>
            </div>
          ) : (
            feedback?.message
          )}
        </div>
      )}

      <form
        className={`${card} space-y-4`}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          callApi(
            {
              action: 'login',
              email: fd.get('email'),
              password: fd.get('password'),
            },
            'Login iniciado. Se o LinkedIn pedir, aprove no celular — aguardando até 2 minutos...'
          );
        }}
      >
        <h2 className="text-xl font-semibold">1. Login com email e senha</h2>
        <p className="text-sm text-[#afafaf]">
          Após clicar, o sistema espera a aprovação no celular (até 2 min) e só então salva a sessão.
          Não feche esta página enquanto o status azul estiver ativo.
        </p>
        <div>
          <label className={label}>Email LinkedIn</label>
          <input name="email" type="email" required disabled={busy} className={field} />
        </div>
        <div>
          <label className={label}>Senha</label>
          <input name="password" type="password" required disabled={busy} className={field} />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-[#da0037] px-6 py-2.5 font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {loadingAction === 'login' ? 'Aguardando aprovação...' : 'Logar e salvar sessão'}
        </button>
      </form>

      <form
        className={`${card} space-y-4`}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          callApi(
            {
              action: 'cookies',
              li_at: fd.get('li_at'),
              jsessionid: fd.get('jsessionid'),
            },
            'Salvando cookie e validando sessão...'
          );
        }}
      >
        <h2 className="text-xl font-semibold">2. Conectar com cookie (recomendado se 2FA falhar)</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-[#afafaf]">
          <li>Abra o LinkedIn logado no navegador</li>
          <li>
            DevTools → Application → Cookies → <code className="text-[#ededed]">linkedin.com</code>
          </li>
          <li>
            Copie <code className="text-[#ededed]">li_at</code>
          </li>
        </ol>
        <div>
          <label className={label}>Cookie li_at *</label>
          <textarea name="li_at" required rows={3} disabled={busy} className={field} />
        </div>
        <div>
          <label className={label}>Cookie JSESSIONID (opcional)</label>
          <input name="jsessionid" disabled={busy} className={field} />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-[#da0037] px-6 py-2.5 font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {loadingAction === 'cookies' ? 'Validando...' : 'Salvar e validar sessão'}
        </button>
      </form>
    </div>
  );
}
