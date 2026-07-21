export type WorkerStatusSummary = {
  desiredEnabled: boolean;
  processRunning: boolean;
  activeCycle: boolean;
};

export function workerStatusLabel(status: WorkerStatusSummary): string {
  if (status.activeCycle && !status.desiredEnabled) return 'Parando após ciclo atual';
  if (status.activeCycle) return 'Executando ciclo';
  if (status.processRunning && status.desiredEnabled) return 'Rodando';
  if (status.desiredEnabled) return 'Ligado, aguardando processo';
  return 'Parado';
}
