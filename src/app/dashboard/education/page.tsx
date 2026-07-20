import { db } from '@/db';
import { education } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export default async function EducationDashboard() {
  const rows = await db.select().from(education).orderBy(asc(education.locale));

  async function upsert(formData: FormData) {
    'use server';
    const id = formData.get('id');
    const payload = {
      institution: String(formData.get('institution') || ''),
      degree: String(formData.get('degree') || ''),
      startDate: String(formData.get('startDate') || ''),
      endDate: String(formData.get('endDate') || ''),
      locale: String(formData.get('locale') || 'en'),
    };
    if (id) await db.update(education).set(payload).where(eq(education.id, Number(id)));
    else await db.insert(education).values(payload);
    revalidatePath('/dashboard/education');
    revalidatePath('/pt-BR');
    revalidatePath('/en');
  }

  async function remove(formData: FormData) {
    'use server';
    await db.delete(education).where(eq(education.id, Number(formData.get('id'))));
    revalidatePath('/dashboard/education');
    revalidatePath('/pt-BR');
    revalidatePath('/en');
  }

  const field = 'w-full rounded border border-[#333] bg-[#131313] p-2 text-sm text-[#ededed]';

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-3xl font-bold text-[#da0037]">Education</h1>

      <form action={upsert} className="grid gap-3 rounded-lg border border-[#2a2a2a] bg-[#171717] p-6 md:grid-cols-2">
        <input name="institution" placeholder="Institution" required className={field} />
        <input name="degree" placeholder="Degree" required className={field} />
        <input name="startDate" placeholder="Start" required className={field} />
        <input name="endDate" placeholder="End" className={field} />
        <select name="locale" className={field}>
          <option value="en">en</option>
          <option value="pt-BR">pt-BR</option>
        </select>
        <button type="submit" className="rounded bg-[#da0037] p-2 font-bold text-white">
          Add
        </button>
      </form>

      <div className="space-y-4">
        {rows.map((row) => (
          <form key={row.id} action={upsert} className="grid gap-3 rounded-lg border border-[#2a2a2a] bg-[#171717] p-6 md:grid-cols-2">
            <input type="hidden" name="id" value={row.id} />
            <input name="institution" defaultValue={row.institution} className={field} />
            <input name="degree" defaultValue={row.degree} className={field} />
            <input name="startDate" defaultValue={row.startDate} className={field} />
            <input name="endDate" defaultValue={row.endDate || ''} className={field} />
            <select name="locale" defaultValue={row.locale} className={field}>
              <option value="en">en</option>
              <option value="pt-BR">pt-BR</option>
            </select>
            <div className="flex gap-2">
              <button type="submit" className="rounded bg-[#da0037] px-4 py-2 font-bold text-white">
                Save
              </button>
              <button formAction={remove} className="rounded border border-[#da0037] px-4 py-2 text-[#da0037]">
                Delete
              </button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
