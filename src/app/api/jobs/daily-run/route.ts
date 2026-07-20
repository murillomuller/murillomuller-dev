import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { runDailyCycle } from '@/jobs/daily-runner';

export const maxDuration = 300; // 5 minutes
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runDailyCycle();
    return NextResponse.json({ ok: true, result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
