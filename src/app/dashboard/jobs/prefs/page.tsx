import { db } from '@/db';
import { jobSearchPrefs } from '@/db/schema';
import { revalidatePath } from 'next/cache';

export default async function JobPrefsDashboard() {
  let prefs = await db.select().from(jobSearchPrefs).limit(1).then((res) => res[0]);

  if (!prefs) {
    await db.insert(jobSearchPrefs).values({});
    prefs = await db.select().from(jobSearchPrefs).limit(1).then((res) => res[0]);
  }

  async function updatePrefs(formData: FormData) {
    'use server';
    const payload = {
      keywords: String(formData.get('keywords') || ''),
      titles: String(formData.get('titles') || ''),
      locations: String(formData.get('locations') || ''),
      workplaces: String(formData.get('workplaces') || ''),
      seniority: String(formData.get('seniority') || ''),
      salaryMin: Number(formData.get('salaryMin')) || null,
      excludedCompanies: String(formData.get('excludedCompanies') || ''),
      languages: String(formData.get('languages') || ''),
      enabledSources: '["linkedin","unlockcareer"]',
      autoApplyEnabled: formData.get('autoApplyEnabled') === 'on',
      minMatchScore: Number(formData.get('minMatchScore')) || 70,
      maxAppliesPerDay: Number(formData.get('maxAppliesPerDay')) || 20,
    };

    const id = formData.get('id');
    if (id) {
      await db.update(jobSearchPrefs).set(payload);
    }
    revalidatePath('/dashboard/jobs/prefs');
    revalidatePath('/dashboard/jobs');
  }

  const field = 'w-full rounded border border-[#333] bg-[#131313] p-2 text-sm text-[#ededed]';
  const label = 'mb-1 block text-sm text-[#afafaf]';

  return (
    <div className="space-y-6">
      <form action={updatePrefs} className="space-y-4 rounded-lg border border-[#2a2a2a] bg-[#171717] p-6">
        <input type="hidden" name="id" value={prefs?.id || ''} />

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={label}>Keywords (comma separated)</label>
            <input name="keywords" defaultValue={prefs?.keywords} className={field} />
          </div>
          <div>
            <label className={label}>Titles (comma separated)</label>
            <input name="titles" defaultValue={prefs?.titles} className={field} />
          </div>

          <div>
            <label className={label}>Locations (comma separated)</label>
            <input name="locations" defaultValue={prefs?.locations} className={field} />
          </div>
          <div>
            <label className={label}>Workplaces</label>
            <input name="workplaces" defaultValue={prefs?.workplaces} placeholder="remote,hybrid,onsite" className={field} />
          </div>

          <div>
            <label className={label}>Seniority</label>
            <input name="seniority" defaultValue={prefs?.seniority} className={field} />
          </div>
          <div>
            <label className={label}>Min Salary (Numbers only)</label>
            <input name="salaryMin" type="number" defaultValue={prefs?.salaryMin || ''} className={field} />
          </div>

          <div className="md:col-span-2">
            <label className={label}>Excluded Companies (comma separated)</label>
            <input name="excludedCompanies" defaultValue={prefs?.excludedCompanies} className={field} />
          </div>

          <div>
            <label className={label}>Languages</label>
            <input name="languages" defaultValue={prefs?.languages} className={field} />
          </div>
          
          <div>
            <label className={label}>Enabled Sources</label>
            <div className="flex flex-col gap-2 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked disabled className="h-4 w-4 accent-[#da0037]" />
                LinkedIn
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked disabled className="h-4 w-4 accent-[#da0037]" />
                Unlock Career
              </label>
              <span className="text-xs text-[#747474]">Drafts live in data/unlockcareer — confirm before submit</span>
            </div>
          </div>

          <div>
            <label className={label}>Min Match Score (0-100)</label>
            <input name="minMatchScore" type="number" defaultValue={prefs?.minMatchScore} className={field} />
          </div>
          <div>
            <label className={label}>Max Applies Per Day</label>
            <input name="maxAppliesPerDay" type="number" defaultValue={prefs?.maxAppliesPerDay} className={field} />
          </div>

          <div className="md:col-span-2 flex items-center gap-2 mt-4 rounded border border-red-900/30 bg-red-950/20 p-4">
            <input 
              name="autoApplyEnabled" 
              type="checkbox" 
              id="autoApply"
              defaultChecked={prefs?.autoApplyEnabled} 
              className="h-5 w-5 accent-[#da0037]" 
            />
            <label htmlFor="autoApply" className="font-bold text-[#da0037] cursor-pointer">
              Enable Auto-Apply (Kill Switch)
            </label>
            <span className="text-xs text-[#afafaf] ml-2">
              Uncheck to pause all automated applications immediately.
            </span>
          </div>
        </div>

        <button type="submit" className="mt-4 rounded bg-[#da0037] px-6 py-2 font-bold text-white transition-opacity hover:opacity-90">
          Save Preferences
        </button>
      </form>
    </div>
  );
}
