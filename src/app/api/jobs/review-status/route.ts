import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { applications } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const appId = Number(body.appId);
  const status = String(body.status || '');
  if (!appId || !['applied_manual', 'skipped', 'needs_review'].includes(status)) {
    return NextResponse.json({ ok: false, message: 'Invalid payload' }, { status: 400 });
  }

  await db
    .update(applications)
    .set({
      status,
      pendingError: status === 'applied_manual' ? null : undefined,
      pendingFieldsJson: status === 'applied_manual' ? null : undefined,
      updatedAt: Date.now(),
    })
    .where(eq(applications.id, appId));

  return NextResponse.json({ ok: true, status });
}
