import { db } from '@/db';
import { eq, asc } from 'drizzle-orm';
import { profile, about, experience, skills, education, languages, portfolio, uiStrings } from '@/db/schema';
import Image from 'next/image';
import Link from 'next/link';
import { Reveal } from '@/components/motion/Reveal';
import { SidebarIntro } from '@/components/motion/SidebarIntro';
import { SkillBars } from '@/components/motion/SkillBars';

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.28-.01-1.02-.02-2-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.08 1.85 1.24 1.85 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23.96-.27 1.98-.4 3-.4s2.04.13 3 .4c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22 0 1.61-.01 2.91-.01 3.31 0 .32.22.69.83.57C20.56 21.8 24 17.3 24 12 24 5.37 18.63 0 12 0z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.73V1.73C24 .77 23.21 0 22.23 0z" />
    </svg>
  );
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // Fetch data
  const profileData = await db.select().from(profile).where(eq(profile.locale, locale)).limit(1);
  const aboutData = await db.select().from(about).where(eq(about.locale, locale));
  const expData = await db.select().from(experience).where(eq(experience.locale, locale)).orderBy(asc(experience.sortOrder));
  const skillsData = await db.select().from(skills).orderBy(asc(skills.sortOrder));
  const eduData = await db.select().from(education).where(eq(education.locale, locale));
  const langData = await db.select().from(languages).where(eq(languages.locale, locale)).orderBy(asc(languages.sortOrder));
  const portData = await db.select().from(portfolio).where(eq(portfolio.locale, locale)).orderBy(asc(portfolio.sortOrder));
  const uiData = await db.select().from(uiStrings).where(eq(uiStrings.locale, locale));

  const ui = uiData.reduce((acc, item) => ({ ...acc, [item.key]: item.value }), {} as Record<string, string>);
  const p = profileData[0];

  if (!p) return <div className="p-8">No profile data found for {locale}. Try seeding the database.</div>;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <SidebarIntro className="z-10 flex h-full flex-col items-center bg-background-darker px-6 py-12 shadow-xl md:fixed md:w-[265px]">
        <div data-intro-item className="mb-6 h-32 w-32 overflow-hidden rounded-full border-4 border-[#222]">
          <Image
            src={p.avatarPath || '/images/profile_pic.jpg'}
            alt={p.name}
            width={128}
            height={128}
            className="h-full w-full object-cover"
          />
        </div>
        <h1 data-intro-item className="mb-2 text-center text-2xl font-bold">
          {p.name}
        </h1>
        <h2 data-intro-item className="mb-8 text-center text-sm font-light tracking-widest text-primary">
          {p.role}
        </h2>

        <nav data-intro-item className="flex w-full flex-col gap-4 text-center text-sm text-text-secondary">
          <a href="#about" className="transition-colors hover:text-primary">
            {ui['about.title']}
          </a>
          <a href="#experience" className="transition-colors hover:text-primary">
            {ui['experience.title']}
          </a>
          <a href="#skills" className="transition-colors hover:text-primary">
            {ui['techskills.title']}
          </a>
          <a href="#education" className="transition-colors hover:text-primary">
            {ui['academic.title']}
          </a>
          <a href="#languages" className="transition-colors hover:text-primary">
            {ui['language.title']}
          </a>
          <a href="#portfolio" className="transition-colors hover:text-primary">
            {ui['portfolio.title']}
          </a>
        </nav>

        <div data-intro-item className="mt-auto flex flex-col items-center gap-4 pt-10">
          <div className="flex items-center gap-4">
            <Link
              href="/pt-BR"
              className={locale === 'pt-BR' ? 'rounded-sm opacity-100 ring-2 ring-primary' : 'opacity-50 hover:opacity-100'}
              title="Português"
            >
              <Image
                src="/assets/brazil_flag.png"
                alt="PT-BR"
                width={28}
                height={20}
                className="h-auto w-[28px] rounded-sm object-cover"
              />
            </Link>
            <Link
              href="/en"
              className={locale === 'en' ? 'rounded-sm opacity-100 ring-2 ring-primary' : 'opacity-50 hover:opacity-100'}
              title="English"
            >
              <Image
                src="/assets/usa_flag.png"
                alt="EN"
                width={28}
                height={20}
                className="h-auto w-[28px] rounded-sm object-cover"
              />
            </Link>
          </div>
          <div className="mt-2 flex gap-5">
            {p.githubUrl && (
              <a
                href={p.githubUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="text-text-secondary transition-colors hover:text-primary"
              >
                <GitHubIcon className="size-5" />
              </a>
            )}
            {p.linkedinUrl && (
              <a
                href={p.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="text-text-secondary transition-colors hover:text-primary"
              >
                <LinkedInIcon className="size-5" />
              </a>
            )}
          </div>
        </div>
      </SidebarIntro>

      <main className="max-w-4xl flex-1 bg-[#171717] px-6 py-12 md:ml-[265px] md:p-20">
        <Reveal>
          <section id="about" className="mb-20">
            <SectionTitle title={ui['about.title']} />
            <h3 className="mb-4 text-2xl font-light">
              <span className="font-bold text-primary">{ui['about.hi']}</span>!
            </h3>
            <div className="space-y-4 leading-relaxed text-text-secondary">
              {aboutData.map((a) => (
                <p key={a.id}>{a.content}</p>
              ))}
            </div>
            <div className="mt-8 flex gap-4">
              <a
                href={`/api/cv?locale=${locale}&format=pdf`}
                className="inline-block rounded-full border-2 border-primary px-8 py-3 text-sm font-semibold tracking-wider text-primary uppercase transition-all hover:bg-primary hover:text-white"
              >
                {ui['about.downloadcv'] || 'Download CV'} (PDF)
              </a>
              <a
                href={`/api/cv?locale=${locale}&format=docx`}
                className="inline-block rounded-full border-2 border-primary px-8 py-3 text-sm font-semibold tracking-wider text-primary uppercase transition-all hover:bg-primary hover:text-white"
              >
                (DOCX)
              </a>
            </div>
          </section>
        </Reveal>

        <Reveal delay={0.05}>
          <section id="experience" className="mb-20">
            <SectionTitle title={ui['experience.title']} />
            <div className="relative space-y-10 border-l-2 border-primary/30 pl-4">
              {expData.map((job) => (
                <div key={job.id} className="relative">
                  <div className="absolute top-1 -left-[25px] h-4 w-4 rounded-full bg-primary" />
                  <div className="mb-1">
                    <h4 className="text-xl font-bold">{job.company}</h4>
                    <span className="text-sm font-semibold text-primary">{job.role}</span>
                  </div>
                  <div className="mb-3 inline-block rounded bg-[#111] px-3 py-1 text-xs text-gray-500">
                    {job.startDate} - {job.endDate || 'Present'}
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-text-secondary">{job.description}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section id="skills" className="mb-20">
            <SectionTitle title={ui['techskills.title']} />
            <SkillBars skills={skillsData} />
          </section>
        </Reveal>

        <Reveal>
          <div className="mb-20 grid gap-12 md:grid-cols-2">
            <section id="education">
              <SectionTitle title={ui['academic.title']} />
              <div className="space-y-6">
                {eduData.map((edu) => (
                  <div key={edu.id}>
                    <h4 className="text-lg font-bold">{edu.institution}</h4>
                    <p className="mb-1 text-sm text-primary">{edu.degree}</p>
                    <p className="text-xs text-gray-500">
                      {edu.startDate} - {edu.endDate}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section id="languages">
              <SectionTitle title={ui['language.title']} />
              <div className="space-y-4">
                {langData.map((l) => (
                  <div key={l.id} className="flex flex-col">
                    <span className="font-bold">{l.name}</span>
                    <span className="text-sm text-text-secondary">{l.level}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </Reveal>

        <Reveal>
          <section id="portfolio" className="mb-20">
            <SectionTitle title={ui['portfolio.title']} />
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {portData.map((item) => (
                <div key={item.id} className="group relative overflow-hidden rounded border border-[#222] bg-[#111]">
                  <div className="p-6">
                    <h4 className="mb-3 text-lg font-bold text-primary">{item.title}</h4>
                    <p className="text-sm leading-relaxed text-text-secondary">{item.description}</p>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-block text-xs font-bold hover:underline"
                      >
                        VIEW PROJECT
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      </main>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-10 inline-block relative">
      <h2 className="text-2xl font-bold uppercase tracking-wide">{title}</h2>
      <div className="w-1/2 h-1 bg-primary mt-2"></div>
    </div>
  );
}
