import { db } from '@/db';
import { profile, about } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export default async function ProfileDashboard() {
  const profilePT = await db.select().from(profile).where(eq(profile.locale, 'pt-BR')).limit(1).then((res) => res[0]);
  const profileEN = await db.select().from(profile).where(eq(profile.locale, 'en')).limit(1).then((res) => res[0]);
  const aboutPT = await db.select().from(about).where(eq(about.locale, 'pt-BR'));
  const aboutEN = await db.select().from(about).where(eq(about.locale, 'en'));

  async function updateProfile(formData: FormData) {
    'use server';
    const name = formData.get('name') as string;
    const githubUrl = formData.get('githubUrl') as string;
    const linkedinUrl = formData.get('linkedinUrl') as string;
    const rolePT = formData.get('rolePT') as string;
    const roleEN = formData.get('roleEN') as string;

    if (profilePT) {
      await db.update(profile).set({ name, githubUrl, linkedinUrl, role: rolePT }).where(eq(profile.id, profilePT.id));
    }
    if (profileEN) {
      await db.update(profile).set({ name, githubUrl, linkedinUrl, role: roleEN }).where(eq(profile.id, profileEN.id));
    }

    revalidatePath('/dashboard/profile');
    revalidatePath('/pt-BR');
    revalidatePath('/en');
  }

  async function updateAbout(formData: FormData) {
    'use server';
    const locale = formData.get('locale') as string;
    const paragraphs = [formData.get('p1'), formData.get('p2'), formData.get('p3')] as string[];
    const rows = await db.select().from(about).where(eq(about.locale, locale));

    for (let i = 0; i < rows.length && i < paragraphs.length; i++) {
      await db.update(about).set({ content: paragraphs[i] || '' }).where(eq(about.id, rows[i].id));
    }

    revalidatePath('/dashboard/profile');
    revalidatePath('/pt-BR');
    revalidatePath('/en');
  }

  const fieldClass =
    'rounded border border-[#333] bg-[#131313] p-2.5 text-sm text-[#ededed] focus:border-[#da0037] focus:outline-none';
  const labelClass = 'text-sm text-[#afafaf]';
  const cardClass = 'rounded-lg border border-[#2a2a2a] bg-[#171717] p-6';

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-3xl font-bold text-[#da0037]">Profile & About</h1>

      <form action={updateProfile} className={`${cardClass} flex flex-col gap-4`}>
        <h2 className="text-xl font-semibold text-[#ededed]">Global Profile</h2>
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Name</label>
          <input name="name" defaultValue={profilePT?.name || ''} className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Github URL</label>
          <input name="githubUrl" defaultValue={profilePT?.githubUrl || ''} className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass}>LinkedIn URL</label>
          <input name="linkedinUrl" defaultValue={profilePT?.linkedinUrl || ''} className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Role (PT-BR)</label>
          <input name="rolePT" defaultValue={profilePT?.role || ''} className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Role (EN)</label>
          <input name="roleEN" defaultValue={profileEN?.role || ''} className={fieldClass} />
        </div>
        <button type="submit" className="mt-2 rounded bg-[#da0037] p-2.5 font-bold text-white hover:opacity-90">
          Save Profile
        </button>
      </form>

      {([
        { locale: 'pt-BR', rows: aboutPT, title: 'About (PT-BR)' },
        { locale: 'en', rows: aboutEN, title: 'About (EN)' },
      ] as const).map((block) => (
        <form key={block.locale} action={updateAbout} className={`${cardClass} flex flex-col gap-4`}>
          <h2 className="text-xl font-semibold text-[#ededed]">{block.title}</h2>
          <input type="hidden" name="locale" value={block.locale} />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-1">
              <label className={labelClass}>Paragraph {i + 1}</label>
              <textarea
                name={`p${i + 1}`}
                rows={3}
                defaultValue={block.rows[i]?.content || ''}
                className={fieldClass}
              />
            </div>
          ))}
          <button type="submit" className="mt-2 rounded bg-[#da0037] p-2.5 font-bold text-white hover:opacity-90">
            Save About
          </button>
        </form>
      ))}
    </div>
  );
}
