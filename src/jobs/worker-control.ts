import { db } from '@/db';
import { jobSearchPrefs, workerRuns } from '@/db/schema';
import { runDailyCycle } from '@/jobs/daily-runner';
import { workerStatusLabel } from '@/jobs/worker-control-state';
import { desc, eq } from 'drizzle-orm';

const DEFAULT_KEYWORDS = 'Frontend Engineer, React, Next.js';
const DEFAULT_TITLES = 'Frontend Engineer, Software Engineer';
const DEFAULT_LOCATIONS = 'Brazil, Remote';
const WORKER_INTERVAL_MS = Number(process.env.JOBS_WORKER_INTERVAL_MS || 4 * 60 * 60 * 1000);

type WorkerRuntimeState = {
  processRunning: boolean;
  activeCycle: boolean;
  stopRequested: boolean;
  startedAt: number | null;
  lastHeartbeat: number | null;
  lastError: string | null;
  nextRunAt: number | null;
  timer: ReturnType<typeof setTimeout> | null;
};

declare global {
  var __jobWorkerControl: WorkerRuntimeState | undefined;
}

function runtimeState(): WorkerRuntimeState {
  if (!globalThis.__jobWorkerControl) {
    globalThis.__jobWorkerControl = {
      processRunning: false,
      activeCycle: false,
      stopRequested: false,
      startedAt: null,
      lastHeartbeat: null,
      lastError: null,
      nextRunAt: null,
      timer: null,
    };
  }
  return globalThis.__jobWorkerControl;
}

async function ensurePrefs() {
  let prefs = await db.select().from(jobSearchPrefs).limit(1).then((rows) => rows[0]);
  if (!prefs) {
    [prefs] = await db
      .insert(jobSearchPrefs)
      .values({
        keywords: DEFAULT_KEYWORDS,
        titles: DEFAULT_TITLES,
        locations: DEFAULT_LOCATIONS,
        autoApplyEnabled: false,
      })
      .returning();
  }
  return prefs;
}

async function setWorkerDesiredEnabled(enabled: boolean) {
  const prefs = await ensurePrefs();
  await db
    .update(jobSearchPrefs)
    .set({ autoApplyEnabled: enabled })
    .where(eq(jobSearchPrefs.id, prefs.id));
}

async function desiredEnabled(): Promise<boolean> {
  const prefs = await ensurePrefs();
  return !!prefs.autoApplyEnabled && process.env.JOBS_AUTO_APPLY !== 'false';
}

function clearTimer(state = runtimeState()) {
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
  state.nextRunAt = null;
}

function markStoppedIfIdle(state = runtimeState()) {
  if (!state.activeCycle) {
    state.processRunning = false;
    state.stopRequested = false;
    state.startedAt = null;
    clearTimer(state);
  }
}

function scheduleNextRun(delayMs: number) {
  const state = runtimeState();
  clearTimer(state);
  if (state.stopRequested) {
    markStoppedIfIdle(state);
    return;
  }

  const delay = Math.max(0, delayMs);
  state.nextRunAt = Date.now() + delay;
  state.timer = setTimeout(() => {
    state.timer = null;
    state.nextRunAt = null;
    void runWorkerLoop();
  }, delay);
  state.timer.unref?.();
}

async function runWorkerLoop() {
  const state = runtimeState();
  if (state.activeCycle) return;

  if (!(await desiredEnabled())) {
    state.stopRequested = true;
    markStoppedIfIdle(state);
    return;
  }

  state.processRunning = true;
  state.activeCycle = true;
  state.lastHeartbeat = Date.now();
  state.lastError = null;

  try {
    await runDailyCycle();
  } catch (error: unknown) {
    state.lastError = error instanceof Error ? error.message : String(error);
    console.error('[WorkerControl] Cycle error:', error);
  } finally {
    state.activeCycle = false;
    state.lastHeartbeat = Date.now();
  }

  if (state.stopRequested || !(await desiredEnabled())) {
    markStoppedIfIdle(state);
    return;
  }

  scheduleNextRun(WORKER_INTERVAL_MS);
}

export async function startWorker(options: { runImmediately?: boolean } = {}) {
  const state = runtimeState();
  await setWorkerDesiredEnabled(true);
  state.stopRequested = false;
  state.processRunning = true;
  state.startedAt ||= Date.now();
  state.lastHeartbeat = Date.now();

  if (!state.activeCycle && !state.timer) {
    scheduleNextRun(options.runImmediately === false ? WORKER_INTERVAL_MS : 0);
  }

  return getWorkerStatus();
}

export async function stopWorker() {
  const state = runtimeState();
  await setWorkerDesiredEnabled(false);
  state.stopRequested = true;
  clearTimer(state);
  markStoppedIfIdle(state);
  return getWorkerStatus();
}

export async function runWorkerOnceNow() {
  const state = runtimeState();
  await setWorkerDesiredEnabled(true);
  state.stopRequested = false;
  state.processRunning = true;
  state.startedAt ||= Date.now();
  if (!state.activeCycle) {
    clearTimer(state);
    scheduleNextRun(0);
  }
  return getWorkerStatus();
}

export async function getWorkerStatus() {
  const state = runtimeState();
  const prefs = await ensurePrefs();
  const [lastRun] = await db
    .select()
    .from(workerRuns)
    .orderBy(desc(workerRuns.startedAt))
    .limit(1);

  const desired = !!prefs.autoApplyEnabled && process.env.JOBS_AUTO_APPLY !== 'false';
  if (!desired && !state.activeCycle) {
    markStoppedIfIdle(state);
  }

  const summary = {
    desiredEnabled: desired,
    processRunning: state.processRunning,
    activeCycle: state.activeCycle,
  };

  return {
    ...summary,
    label: workerStatusLabel(summary),
    startedAt: state.startedAt,
    lastHeartbeat: state.lastHeartbeat,
    nextRunAt: state.nextRunAt,
    lastError: state.lastError,
    intervalMs: WORKER_INTERVAL_MS,
    killSwitchActive: process.env.JOBS_AUTO_APPLY === 'false',
    lastRun: lastRun
      ? {
          id: lastRun.id,
          startedAt: lastRun.startedAt,
          endedAt: lastRun.endedAt,
          searched: lastRun.searched,
          scored: lastRun.scored,
          applied: lastRun.applied,
          needsReview: lastRun.needsReview,
          failed: lastRun.failed,
          skipped: lastRun.skipped,
          message: lastRun.message,
        }
      : null,
  };
}
