import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getWorkerStatus, runWorkerOnceNow, startWorker, stopWorker } from '@/jobs/worker-control';

export const runtime = 'nodejs';

type WorkerAction = 'start' | 'stop' | 'run-now';

async function requireSession() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;
  return NextResponse.json({ ok: true, status: await getWorkerStatus() });
}

export async function POST(request: Request) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => ({}));
  const action = body.action as WorkerAction;

  if (action === 'start') {
    return NextResponse.json({ ok: true, status: await startWorker({ runImmediately: true }) });
  }

  if (action === 'stop') {
    return NextResponse.json({ ok: true, status: await stopWorker() });
  }

  if (action === 'run-now') {
    return NextResponse.json({ ok: true, status: await runWorkerOnceNow() });
  }

  return NextResponse.json({ ok: false, message: 'Invalid action' }, { status: 400 });
}
