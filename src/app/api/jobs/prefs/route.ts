import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { jobSearchPrefs } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const keywords = typeof body.keywords === 'string' ? body.keywords : undefined;
  const locations = typeof body.locations === 'string' ? body.locations : undefined;
  const titles = typeof body.titles === 'string' ? body.titles : undefined;

  let prefs = await db.select().from(jobSearchPrefs).limit(1).then((r) => r[0]);
  if (!prefs) {
    const [row] = await db
      .insert(jobSearchPrefs)
      .values({
        keywords: keywords || 'Frontend Engineer, React, Next.js',
        titles: titles || 'Frontend Engineer, Software Engineer',
        locations: locations || 'Brazil, Remote',
      })
      .returning();
    prefs = row;
  } else {
    await db
      .update(jobSearchPrefs)
      .set({
        ...(keywords != null ? { keywords } : {}),
        ...(locations != null ? { locations } : {}),
        ...(titles != null ? { titles } : {}),
      })
      .where(eq(jobSearchPrefs.id, prefs.id));
    prefs = await db.select().from(jobSearchPrefs).limit(1).then((r) => r[0]);
  }

  return NextResponse.json({ ok: true, prefs });
}
