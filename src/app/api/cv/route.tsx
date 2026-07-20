import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { profile, experience, education, languages, applications } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { renderToStream } from '@react-pdf/renderer';
import { VerasResumePdf } from '@/lib/cv/pdf';
import { buildVerasDocx } from '@/lib/cv/docx';
import { defaultLabels } from '@/lib/cv/format';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale') || 'en';
  const format = searchParams.get('format') || 'pdf';
  const appId = searchParams.get('applicationId');

  const profileData = await db
    .select()
    .from(profile)
    .where(eq(profile.locale, locale))
    .limit(1)
    .then((res) => res[0]);
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

  if (!profileData) {
    return new NextResponse('Not found', { status: 404 });
  }

  let finalRole = profileData.role;

  if (appId) {
    const appRecord = await db
      .select()
      .from(applications)
      .where(eq(applications.id, Number(appId)))
      .limit(1)
      .then((res) => res[0]);
    if (appRecord && appRecord.adaptedCvPath) {
      finalRole = `${profileData.role} (Adapted for application)`;
    }
  }

  const base = defaultLabels(locale);
  const labels = {
    ...base,
    // Keep Veras-style English section titles for visual parity
    experience: 'Experience',
    education: 'Education',
    languages: locale === 'pt-BR' ? 'Idiomas' : 'Languages',
  };

  const cvProfile = {
    name: profileData.name,
    role: finalRole,
    githubUrl: profileData.githubUrl,
    linkedinUrl: profileData.linkedinUrl,
  };

  const filename = `Murillo_Muller_CV_${locale}.${format}`;

  if (format === 'pdf') {
    const stream = await renderToStream(
      <VerasResumePdf
        profile={cvProfile}
        experience={expData}
        education={eduData}
        languages={langData}
        labels={labels}
        locale={locale}
      />
    );

    return new NextResponse(stream as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  if (format === 'docx') {
    const buffer = await buildVerasDocx({
      profile: cvProfile,
      experience: expData,
      education: eduData,
      languages: langData,
      labels,
      locale,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  return new NextResponse('Invalid format', { status: 400 });
}
