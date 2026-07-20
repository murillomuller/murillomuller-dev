import { renderToBuffer } from '@react-pdf/renderer';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { db } from '@/db';
import { profile, experience, education, languages } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { VerasResumePdf } from '@/lib/cv/pdf';
import { defaultLabels } from '@/lib/cv/format';

/** Filename recruiters see on upload — no job ids / bot markers. */
export function cvPublicFilename(locale: string = 'en'): string {
  return locale === 'pt-BR' ? 'Murillo_Muller_Curriculo.pdf' : 'Murillo_Muller_Resume.pdf';
}

/** Local disk name: opaque short token (not job14) so files can differ per application. */
export function cvLocalFilename(locale: string, jobId?: number): string {
  const base = locale === 'pt-BR' ? 'Murillo_Muller_Curriculo' : 'Murillo_Muller_Resume';
  if (jobId == null) return `${base}.pdf`;
  const token = crypto.createHash('sha1').update(`cv-${jobId}`).digest('hex').slice(0, 6);
  return `${base}_${token}.pdf`;
}

export async function writePersonalizedCvPdf(options: {
  locale?: string;
  jobId?: number;
  filename?: string;
}): Promise<string> {
  const locale = options.locale || 'pt-BR';
  const profileData = await db
    .select()
    .from(profile)
    .where(eq(profile.locale, locale))
    .limit(1)
    .then((r) => r[0]);
  if (!profileData) throw new Error(`Profile not found for ${locale}`);

  const expData = await db
    .select()
    .from(experience)
    .where(eq(experience.locale, locale))
    .orderBy(asc(experience.sortOrder));
  const eduData = await db.select().from(education).where(eq(education.locale, locale));
  const langData = await db
    .select()
    .from(languages)
    .where(eq(languages.locale, locale))
    .orderBy(asc(languages.sortOrder));

  const labels = {
    ...defaultLabels(locale),
    experience: 'Experience',
    education: 'Education',
    languages: locale === 'pt-BR' ? 'Idiomas' : 'Languages',
  };

  const buffer = await renderToBuffer(
    <VerasResumePdf
      profile={{
        name: profileData.name,
        role: profileData.role,
        githubUrl: profileData.githubUrl,
        linkedinUrl: profileData.linkedinUrl,
      }}
      experience={expData}
      education={eduData}
      languages={langData}
      labels={labels}
      locale={locale}
    />
  );

  const dir = path.join(process.cwd(), 'data', 'job-logs');
  fs.mkdirSync(dir, { recursive: true });
  const filename =
    options.filename || cvLocalFilename(locale, options.jobId);
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}
