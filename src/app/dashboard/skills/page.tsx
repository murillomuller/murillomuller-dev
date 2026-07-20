import { db } from '@/db';
import { skills } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export default async function SkillsDashboard() {
  const rows = await db.select().from(skills).orderBy(asc(skills.sortOrder));

  async function upsert(formData: FormData) {
    'use server';
    const id = formData.get('id');
    const payload = {
      name: String(formData.get('name') || ''),
      level: Number(formData.get('level') || 0),
      sortOrder: Number(formData.get('sortOrder') || 0),
    };
    if (id) await db.update(skills).set(payload).where(eq(skills.id, Number(id)));
    else await db.insert(skills).values(payload);
    revalidatePath('/dashboard/skills');
    revalidatePath('/pt-BR');
    revalidatePath('/en');
  }

  async function remove(formData: FormData) {
    'use server';
    await db.delete(skills).where(eq(skills.id, Number(formData.get('id'))));
    revalidatePath('/dashboard/skills');
    revalidatePath('/pt-BR');
    revalidatePath('/en');
  }

  const field = 'w-full rounded border border-[#333] bg-[#131313] p-2 text-sm text-[#ededed]';

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-3xl font-bold text-[#da0037]">Skills</h1>

      <form action={upsert} className="grid gap-3 rounded-lg border border-[#2a2a2a] bg-[#171717] p-6 md:grid-cols-3">
        <input name="name" placeholder="Skill" required className={field} />
        <input name="level" type="number" min={0} max={100} placeholder="Level 0-100" required className={field} />
        <input name="sortOrder" type="number" defaultValue={0} className={field} />
        <button type="submit" className="rounded bg-[#da0037] p-2 font-bold text-white md:col-span-3">
          Add skill
        </button>
      </form>

      <div className="space-y-3">
        {rows.map((row) => (
          <form key={row.id} action={upsert} className="grid gap-3 rounded-lg border border-[#2a2a2a] bg-[#171717] p-4 md:grid-cols-[1fr_100px_80px_auto_auto]">
            <input type="hidden" name="id" value={row.id} />
            <input name="name" defaultValue={row.name} className={field} />
            <input name="level" type="number" defaultValue={row.level} className={field} />
            <input name="sortOrder" type="number" defaultValue={row.sortOrder} className={field} />
            <button type="submit" className="rounded bg-[#da0037] px-3 py-2 text-sm font-bold text-white">
              Save
            </button>
            <button formAction={remove} className="rounded border border-[#da0037] px-3 py-2 text-sm text-[#da0037]">
              Delete
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
