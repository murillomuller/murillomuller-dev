import { db } from '@/db';
import { about, education, experience, languages, profile, skills } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';

export type CvSnapshot = {
  name: string;
  role: string;
  about: string;
  experience: string;
  skills: string;
  education: string;
  languages: string;
};

/** Build a compact CV text from SQLite for OpenAI matching. */
export async function loadCvSnapshot(locale = 'en'): Promise<CvSnapshot> {
  const p =
    (await db.select().from(profile).where(eq(profile.locale, locale)).limit(1).then((r) => r[0])) ||
    (await db.select().from(profile).limit(1).then((r) => r[0]));

  const aboutRows = await db
    .select()
    .from(about)
    .where(eq(about.locale, p?.locale || locale));
  const expRows = await db
    .select()
    .from(experience)
    .where(eq(experience.locale, p?.locale || locale))
    .orderBy(asc(experience.sortOrder));
  const skillRows = await db.select().from(skills).orderBy(asc(skills.sortOrder));
  const eduRows = await db
    .select()
    .from(education)
    .where(eq(education.locale, p?.locale || locale));
  const langRows = await db
    .select()
    .from(languages)
    .where(eq(languages.locale, p?.locale || locale))
    .orderBy(asc(languages.sortOrder));

  return {
    name: p?.name || 'Candidate',
    role: p?.role || '',
    about: aboutRows.map((a) => a.content).join('\n'),
    experience: expRows
      .map(
        (e) =>
          `${e.role} @ ${e.company} (${e.startDate}–${e.endDate || 'Present'}): ${e.description}`
      )
      .join('\n'),
    skills: skillRows.map((s) => `${s.name} (${s.level}%)`).join(', '),
    education: eduRows.map((e) => `${e.degree} — ${e.institution}`).join('\n'),
    languages: langRows.map((l) => `${l.name}: ${l.level}`).join(', '),
  };
}

export function cvSnapshotToPrompt(cv: CvSnapshot): string {
  return [
    `Name: ${cv.name}`,
    `Role: ${cv.role}`,
    `About:\n${cv.about}`,
    `Experience:\n${cv.experience}`,
    `Skills: ${cv.skills}`,
    `Education:\n${cv.education}`,
    `Languages: ${cv.languages}`,
  ].join('\n\n');
}

export { candidatePositioningPrompt } from './candidate-positioning';

