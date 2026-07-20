'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function ReportsClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runFeedback, setRunFeedback] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/jobs/reports')
      .then(res => res.json())
      .then(d => {
        if (d.ok) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function runDaily() {
    setRunning(true);
    setRunFeedback('Rodando ciclo...');
    try {
      const res = await fetch('/api/jobs/daily-run', { method: 'POST' });
      const d = await res.json();
      if (d.ok) {
        setRunFeedback(`Ciclo finalizado! Aplicadas: ${d.result.applied}, Revisar: ${d.result.needsReview}, Restam: ${d.result.remainingQuota}`);
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setRunFeedback('Erro: ' + d.message);
      }
    } catch (e: any) {
      setRunFeedback('Erro: ' + e.message);
    } finally {
      setRunning(false);
    }
  }

  if (loading) return <div className="text-[#afafaf] p-6 text-sm">Carregando...</div>;
  if (!data) return <div className="text-red-400 p-6 text-sm">Erro ao carregar relatórios.</div>;

  const dates = Object.keys(data.byDate).sort();
  const maxBar = Math.max(1, ...dates.map(d => data.byDate[d].applied + data.byDate[d].review + data.byDate[d].failed));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <h2 className="text-xl font-bold text-[#ededed]">Relatórios (Últimos 14 dias)</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#afafaf]">{runFeedback}</span>
          <button 
            onClick={runDaily} 
            disabled={running}
            className="bg-[#da0037] text-white px-4 py-2 rounded text-sm font-bold disabled:opacity-50"
          >
            {running ? 'Rodando...' : 'Rodar ciclo agora'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#171717] border border-[#2a2a2a] p-4 rounded-lg">
          <p className="text-xs text-[#747474] uppercase tracking-wide">Aplicadas Hoje</p>
          <div className="text-3xl font-bold text-[#ededed] mt-1">{data.kpis.appliedToday} <span className="text-sm text-[#747474] font-normal">/ {data.kpis.metaDiaria}</span></div>
        </div>
        <div className="bg-[#171717] border border-[#2a2a2a] p-4 rounded-lg">
          <p className="text-xs text-[#747474] uppercase tracking-wide">Esta Semana</p>
          <div className="text-3xl font-bold text-[#ededed] mt-1">{data.kpis.appliedWeek}</div>
        </div>
        <div className="bg-[#171717] border border-[#2a2a2a] p-4 rounded-lg">
          <p className="text-xs text-[#747474] uppercase tracking-wide">Fila de Revisão</p>
          <div className="text-3xl font-bold text-amber-400 mt-1">{data.kpis.needsReview}</div>
        </div>
        <div className="bg-[#171717] border border-[#2a2a2a] p-4 rounded-lg">
          <p className="text-xs text-[#747474] uppercase tracking-wide">Calor Médio</p>
          <div className="text-3xl font-bold text-green-400 mt-1">{data.kpis.avgScore}%</div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-[#171717] border border-[#2a2a2a] p-6 rounded-lg">
          <h3 className="text-sm font-bold text-[#ededed] mb-4">Volume por dia</h3>
          <div className="flex items-end h-40 gap-2">
            {dates.map(d => {
              const info = data.byDate[d];
              const total = info.applied + info.review + info.failed;
              const hp = total === 0 ? 0 : (info.applied / maxBar) * 100;
              const hr = total === 0 ? 0 : (info.review / maxBar) * 100;
              const hf = total === 0 ? 0 : (info.failed / maxBar) * 100;
              
              return (
                <div key={d} className="flex-1 flex flex-col justify-end group relative">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-[#333] text-white text-[10px] px-2 py-1 rounded z-10 whitespace-nowrap pointer-events-none">
                    {d}<br/>Ap: {info.applied} | Rev: {info.review} | Fal: {info.failed}
                  </div>
                  <div style={{height: `${hf}%`}} className="w-full bg-red-900/50" />
                  <div style={{height: `${hr}%`}} className="w-full bg-amber-500/50" />
                  <div style={{height: `${hp}%`}} className="w-full bg-green-500/80 rounded-t-sm" />
                </div>
              );
            })}
          </div>
          <div className="flex mt-3 gap-4 text-xs text-[#747474] justify-center">
            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500/80" /> Aplicadas</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-amber-500/50" /> Revisar</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-red-900/50" /> Falhas</span>
          </div>
        </div>

        <div className="bg-[#171717] border border-[#2a2a2a] p-6 rounded-lg overflow-hidden flex flex-col">
          <h3 className="text-sm font-bold text-[#ededed] mb-4">Últimos runs do Worker</h3>
          <div className="flex-1 overflow-y-auto space-y-3">
            {data.recentRuns.length === 0 ? (
              <p className="text-sm text-[#747474]">Nenhum run recente.</p>
            ) : data.recentRuns.map((r: any) => (
              <div key={r.id} className="text-xs border-b border-[#2a2a2a] pb-2 last:border-0">
                <div className="text-[#afafaf]">{new Date(r.time).toLocaleString('pt-BR')}</div>
                <div className="text-[#ededed] mt-1">{r.message}</div>
                <div className="text-[#747474] mt-0.5">Ap: {r.applied} | Rev: {r.needsReview} | Skp: {r.skipped}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#171717] border border-[#2a2a2a] p-6 rounded-lg">
        <h3 className="text-sm font-bold text-[#ededed] mb-4">Ações de Hoje ({data.todaysApps.length})</h3>
        {data.todaysApps.length === 0 ? (
          <p className="text-sm text-[#747474]">Nenhuma atividade hoje.</p>
        ) : (
          <div className="space-y-2">
            {data.todaysApps.map((a: any, i: number) => (
              <div key={i} className="flex justify-between items-center text-sm p-2 hover:bg-[#222] rounded">
                <div>
                  <div className="font-semibold text-[#ededed]">{a.title}</div>
                  <div className="text-[#afafaf]">{a.company}</div>
                </div>
                <div className="text-right">
                  <div className={
                    a.status.includes('applied') ? 'text-green-400' :
                    a.status === 'needs_review' ? 'text-amber-400' :
                    'text-red-400'
                  }>
                    {a.status}
                  </div>
                  <div className="text-[#747474] text-xs">Calor: {a.score ?? '?'}%</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
