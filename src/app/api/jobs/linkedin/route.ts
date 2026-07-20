import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  disconnectLinkedInSession,
  getLinkedInSessionStatus,
  loginLinkedInWithCredentials,
  saveStorageStateFromCookies,
  validateLinkedInSession,
} from '@/jobs/linkedin-session';

export const maxDuration = 180;
export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  const status = await getLinkedInSessionStatus();
  return NextResponse.json({ ok: true, status });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || '');

  try {
    if (action === 'login') {
      const email = String(body.email || '').trim();
      const password = String(body.password || '');
      if (!email || !password) {
        return NextResponse.json({ ok: false, message: 'Email e senha são obrigatórios.' }, { status: 400 });
      }
      const result = await loginLinkedInWithCredentials(email, password);
      return NextResponse.json(result);
    }

    if (action === 'cookies') {
      const liAt = String(body.li_at || '').trim();
      const jsessionid = String(body.jsessionid || '').trim();
      if (!liAt) {
        return NextResponse.json({ ok: false, message: 'Cookie li_at é obrigatório.' }, { status: 400 });
      }
      await saveStorageStateFromCookies(liAt, jsessionid || undefined);
      const result = await validateLinkedInSession();
      return NextResponse.json(result);
    }

    if (action === 'validate') {
      const result = await validateLinkedInSession();
      return NextResponse.json(result);
    }

    if (action === 'disconnect') {
      await disconnectLinkedInSession();
      return NextResponse.json({ ok: true, message: 'Sessão LinkedIn removida.' });
    }

    return NextResponse.json({ ok: false, message: 'Ação inválida.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
