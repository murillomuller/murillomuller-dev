import { db } from '@/db';
import { portfolio } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export default async function PortfolioDashboard() {
  const rows = await db.select().from(portfolio).orderBy(asc(portfolio.locale), asc(portfolio.sortOrder));

  async function upsert(formData: FormData) {
    'use server';
    const id = formData.get('id');
    const payload = {
      title: String(formData.get('title') || ''),
      description: String(formData.get('description') || ''),
      imagePath: String(formData.get('imagePath') || ''),
      link: String(formData.get('link') || ''),
      locale: String(formData.get('locale') || 'en'),
      sortOrder: Number(formData.get('sortOrder') || 0),
    };
    if (id) await db.update(portfolio).set(payload).where(eq(portfolio.id, Number(id)));
    else await db.insert(portfolio).values(payload);
    revalidatePath('/dashboard/portfolio');
    revalidatePath('/pt-BR');
    revalidatePath('/en');
  }

  async function remove(formData: FormData) {
    'use server';
    await db.delete(portfolio).where(eq(portfolio.id, Number(formData.get('id'))));
    revalidatePath('/dashboard/portfolio');
    revalidatePath('/pt-BR');
    revalidatePath('/en');
  }

  const field = 'w-full rounded border border-[#333] bg-[#131313] p-2 text-sm text-[#ededed]';

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-3xl font-bold text-[#da0037]">Portfolio</h1>

      <form action={upsert} className="grid gap-3 rounded-lg border border-[#2a2a2a] bg-[#171717] p-6 md:grid-cols-2">
        <input name="title" placeholder="Title" required className={field} />
        <input name="link" placeholder="Link" className={field} />
        <input name="imagePath" placeholder="Image path" className={field} />
        <select name="locale" className={field}>
          <option value="en">en</option>
          <option value="pt-BR">pt-BR</option>
        </select>
        <input name="sortOrder" type="number" defaultValue={0} className={field} />
        <textarea name="description" placeholder="Description" rows={3} required className={`md:col-span-2 ${field}`} />
        <button type="submit" className="rounded bg-[#da0037] p-2 font-bold text-white md:col-span-2">
          Add
        </button>
      </form>

      <div className="space-y-4">
        {rows.map((row) => (
          <form key={row.id} action={upsert} className="grid gap-3 rounded-lg border border-[#2a2a2a] bg-[#171717] p-6 md:grid-cols-2">
            <input type="hidden" name="id" value={row.id} />
            <input name="title" defaultValue={row.title} className={field} />
            <input name="link" defaultValue={row.link || ''} className={field} />
            <input name="imagePath" defaultValue={row.imagePath || ''} className={field} />
            <select name="locale" defaultValue={row.locale} className={field}>
              <option value="en">en</option>
              <option value="pt-BR">pt-BR</option>
            </select>
            <input name="sortOrder" type="number" defaultValue={row.sortOrder} className={field} />
            <textarea name="description" defaultValue={row.description} rows={3} className={`md:col-span-2 ${field}`} />
            <div className="md:col-span-2 flex gap-2">
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
