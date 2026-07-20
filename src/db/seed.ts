import { db } from './index';
import { profile, about, experience, skills, education, languages, portfolio, uiStrings } from './schema';
import * as fs from 'fs';
import * as path from 'path';

async function seed() {
  console.log('Seeding database...');
  
  // Clear existing
  db.delete(profile).run();
  db.delete(about).run();
  db.delete(experience).run();
  db.delete(skills).run();
  db.delete(education).run();
  db.delete(languages).run();
  db.delete(portfolio).run();
  db.delete(uiStrings).run();

  const locales = ['pt-BR', 'en'];
  const legacyMap: Record<string, string> = { 'pt-BR': 'br', en: 'en' };

  // Profile data
  const avatarPath = '/images/profile_pic.jpg'; // We'll copy from legacy
  const githubUrl = 'https://github.com/murillomuller';
  const linkedinUrl = 'https://www.linkedin.com/in/murillomuller/';

  // Skills aligned with current experience (Squad AI, Puríssima, Solfácil, CASSI/Kodiak)
  const legacySkills = [
    { name: 'React', level: 100 },
    { name: 'Next.js', level: 95 },
    { name: 'React Native', level: 100 },
    { name: 'iOS / Android (nativo)', level: 45 },
    { name: 'Redux / Redux Toolkit', level: 90 },
    { name: 'Zustand', level: 85 },
    { name: 'Vue.js', level: 85 },
    { name: 'TypeScript', level: 90 },
    { name: 'JavaScript', level: 100 },
    { name: 'Python', level: 80 },
    { name: 'Node.js', level: 85 },
    { name: 'GraphQL', level: 80 },
    { name: 'Kafka', level: 75 },
    { name: 'Tailwind CSS', level: 90 },
    { name: 'shadcn/ui', level: 90 },
    { name: 'MySQL', level: 90 },
    { name: 'PostgreSQL', level: 85 },
    { name: 'AWS', level: 80 },
    { name: 'CI/CD', level: 85 },
    { name: 'Git', level: 100 },
    { name: 'Docker', level: 80 },
    { name: 'Azure DevOps', level: 80 },
    { name: 'Vercel', level: 85 },
    { name: 'Claude Code', level: 90 },
    { name: 'ChatGPT / GPT', level: 90 },
    { name: 'Google Gemini', level: 85 },
    { name: 'AI Agents (Hermes, Cursor)', level: 85 },
    { name: 'MCP (Model Context Protocol)', level: 85 },
    { name: 'HTML/CSS', level: 100 },
    { name: '.NET Core', level: 80 },
    { name: 'SQL Server', level: 70 },
    { name: 'MongoDB', level: 70 },
    { name: 'Java', level: 65 },
  ];

  for (let i = 0; i < legacySkills.length; i++) {
    db.insert(skills).values({
      name: legacySkills[i].name,
      level: legacySkills[i].level,
      sortOrder: i,
    }).run();
  }

  for (const locale of locales) {
    const legacyFolder = legacyMap[locale];
    const commonPath = path.join(process.cwd(), 'legacy', 'public', 'locales', legacyFolder, 'common.json');
    
    if (fs.existsSync(commonPath)) {
      const data = JSON.parse(fs.readFileSync(commonPath, 'utf8'));

      // Profile
      db.insert(profile).values({
        name: 'Murillo Müller',
        role: data.profile?.role || 'FULLSTACK DEVELOPER',
        avatarPath,
        githubUrl,
        linkedinUrl,
        locale,
      }).run();

      // About
      const aboutSec = data.sections?.about || {};
      db.insert(about).values({ content: aboutSec.first || '', locale }).run();
      db.insert(about).values({ content: aboutSec.second || '', locale }).run();
      db.insert(about).values({ content: aboutSec.third || '', locale }).run();

      // Experience
      const expSec = data.sections?.experience?.jobs || [];
      for (let i = 0; i < expSec.length; i++) {
        db.insert(experience).values({
          company: expSec[i].company,
          role: expSec[i].role || '',
          startDate: expSec[i].start,
          endDate: expSec[i].end,
          description: expSec[i].description,
          sortOrder: i,
          locale,
        }).run();
      }

      // Education (hardcoded in legacy, using some data here)
      // I'll add UniCEUB CS explicitly, translating dates
      db.insert(education).values({
        institution: 'UniCEUB',
        degree: locale === 'pt-BR' ? 'Bacharelado em Ciência da Computação' : 'Bachelor of Computer Science',
        startDate: locale === 'pt-BR' ? 'Jan/2014' : 'Jan 2014',
        endDate: locale === 'pt-BR' ? 'Dez/2019' : 'Dec 2019',
        locale,
      }).run();

      // Languages
      if (locale === 'pt-BR') {
        db.insert(languages).values({ name: 'Português', level: 'Nativo', sortOrder: 0, locale }).run();
        db.insert(languages).values({ name: 'Inglês', level: 'Intermediário', sortOrder: 1, locale }).run();
      } else {
        db.insert(languages).values({ name: 'Portuguese', level: 'Native', sortOrder: 0, locale }).run();
        db.insert(languages).values({ name: 'English', level: 'Intermediary', sortOrder: 1, locale }).run();
      }

      // Portfolio
      const portKeys = ['purple', 'goobra', '7virtual'];
      for (let i = 0; i < portKeys.length; i++) {
        const key = portKeys[i];
        if (data.sections?.portfolio?.[key]) {
          db.insert(portfolio).values({
            title: key === 'purple' ? 'Purple' : key === 'goobra' ? 'GoObra' : '7Virtual',
            description: data.sections.portfolio[key],
            imagePath: '', // Assuming images will be added via dashboard
            link: '',
            sortOrder: i,
            locale,
          }).run();
        }
      }

      // UI Strings
      const addUiString = (key: string, value: string) => {
        if (value) db.insert(uiStrings).values({ key, value, locale }).run();
      };
      
      addUiString('about.title', aboutSec.title);
      addUiString('about.hi', aboutSec.hi);
      addUiString('about.downloadcv', aboutSec.downloadcv);
      addUiString('about.contactme', aboutSec.contactme);
      addUiString('experience.title', data.sections?.experience?.title);
      addUiString('techskills.title', data.sections?.techskills?.title);
      addUiString('academic.title', data.sections?.academic?.title);
      addUiString('language.title', data.sections?.language?.title);
      addUiString('portfolio.title', data.sections?.portfolio?.title);
    }
  }

  console.log('Seeding complete.');
}

seed().catch(console.error);
