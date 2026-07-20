export type CvProfile = {
  name: string;
  role: string;
  githubUrl: string | null;
  linkedinUrl: string | null;
};

export type CvExperience = {
  id: number;
  company: string;
  role: string;
  startDate: string;
  endDate: string | null;
  description: string;
};

export type CvEducation = {
  id: number;
  institution: string;
  degree: string;
  startDate: string;
  endDate: string | null;
};

export type CvLanguage = {
  id: number;
  name: string;
  level: string;
};

export type CvLabels = {
  experience: string;
  education: string;
  languages: string;
  skills: string;
  present: string;
  location: string;
};

const COMPANY_URLS: Record<string, string> = {
  Puríssima: 'https://www.purissima.com/',
  'Squad AI': 'https://meetsquad.ai/',
  Deeploy: 'https://www.deeploy.me/',
  Solfácil: 'https://www.solfacil.com.br/',
  Inmetrics: 'https://www.inmetrics.com.br/',
  CASSI: 'https://www.cassi.com.br/',
  Stefanini: 'https://stefanini.com/',
};

const TEAM_BY_COMPANY: Record<string, { en: string; 'pt-BR': string }> = {
  Puríssima: { en: 'Label Factory Platform', 'pt-BR': 'Plataforma de Fábrica de Rótulos' },
  'Squad AI': { en: 'AI Product Platform', 'pt-BR': 'Plataforma de Produto com IA' },
  Deeploy: { en: 'Squad AI · London (remote)', 'pt-BR': 'Squad AI · Londres (remoto)' },
  Solfácil: { en: 'Full Stack Engineering', 'pt-BR': 'Engenharia Full Stack' },
  Inmetrics: { en: 'CASSI · Kodiak Mobile', 'pt-BR': 'CASSI · Mobile Kodiak' },
  CASSI: { en: 'Kodiak Mobile', 'pt-BR': 'Mobile Kodiak' },
  Stefanini: { en: 'CASSI Marketing Team', 'pt-BR': 'Time de Marketing CASSI' },
  'Mundo da Web': { en: 'Web Development', 'pt-BR': 'Desenvolvimento Web' },
};

const LOCATION_BY_COMPANY: Record<string, { en: string; 'pt-BR': string }> = {
  Puríssima: { en: 'Brazil · Remote', 'pt-BR': 'Brasil · Remoto' },
  'Squad AI': { en: 'London, United Kingdom · Remote', 'pt-BR': 'Londres, Reino Unido · Remoto' },
  Deeploy: { en: 'Portugal · Remote (London)', 'pt-BR': 'Portugal · Remoto (Londres)' },
  Solfácil: { en: 'Brazil · Remote', 'pt-BR': 'Brasil · Remoto' },
  Inmetrics: { en: 'Brasília, Brazil', 'pt-BR': 'Brasília, Brasil' },
  CASSI: { en: 'Brasília, Brazil', 'pt-BR': 'Brasília, Brasil' },
  Stefanini: { en: 'Brasília, Brazil', 'pt-BR': 'Brasília, Brasil' },
  'Mundo da Web': { en: 'Brasília, Brazil', 'pt-BR': 'Brasília, Brasil' },
};

const SKILLS_BY_COMPANY: Record<string, string[]> = {
  Inmetrics: ['React Native', 'Redux Toolkit', 'Zustand', 'Sentry', 'Git', 'Mobile'],
  CASSI: ['React Native', 'Micro Frontends', 'Design Patterns', 'Jest', 'Git', 'CSS', 'Mobile'],
  Puríssima: ['Next.js', 'PostgreSQL', 'AWS', 'CI/CD', 'Docker', 'Tailwind CSS', 'Jest'],
  'Squad AI': ['Next.js', 'React', 'TypeScript', 'shadcn/ui', 'Tailwind CSS', 'Vercel', 'Claude Code', 'MCP', 'CSS', 'Jest'],
  Deeploy: ['Next.js', 'React', 'TypeScript', 'shadcn/ui', 'Tailwind CSS', 'Vercel', 'AI Agents', 'CSS', 'Jest'],
  Solfácil: ['Vue.js', 'Python', 'PostgreSQL', 'Kafka', 'GraphQL', 'CSS'],
  Stefanini: ['HTML', 'CSS', 'JavaScript', 'C#', 'ASP.NET'],
  'Mundo da Web': ['HTML', 'CSS', 'JavaScript'],
};

const MONTH_SHORT_EN: Record<string, string> = {
  january: 'Jan',
  february: 'Feb',
  march: 'Mar',
  april: 'Apr',
  may: 'May',
  june: 'Jun',
  july: 'Jul',
  august: 'Aug',
  september: 'Sep',
  october: 'Oct',
  november: 'Nov',
  december: 'Dec',
};

const MONTH_SHORT_PT: Record<string, string> = {
  janeiro: 'Jan',
  fevereiro: 'Fev',
  março: 'Mar',
  marco: 'Mar',
  abril: 'Abr',
  maio: 'Mai',
  junho: 'Jun',
  julho: 'Jul',
  agosto: 'Ago',
  setembro: 'Set',
  outubro: 'Out',
  novembro: 'Nov',
  dezembro: 'Dez',
};

export function shortDate(value: string | null | undefined, presentLabel: string): string {
  if (!value) return presentLabel;
  const trimmed = value.trim();
  if (/^(present|presente)$/i.test(trimmed)) return presentLabel;

  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    const monthKey = parts[0]
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const year = parts[parts.length - 1];
    const short =
      MONTH_SHORT_EN[parts[0].toLowerCase()] ||
      MONTH_SHORT_PT[monthKey] ||
      MONTH_SHORT_PT[parts[0].toLowerCase()] ||
      parts[0].slice(0, 3);
    return `${short} ${year}`;
  }
  return trimmed;
}

export function dateRange(
  start: string,
  end: string | null | undefined,
  presentLabel: string
): string {
  return `${shortDate(start, presentLabel)} – ${shortDate(end, presentLabel)}`;
}

export function companyUrl(company: string): string | undefined {
  return COMPANY_URLS[company];
}

export function teamLabel(company: string, locale: string, role?: string): string {
  if (company === 'CASSI') {
    const r = (role || '').toLowerCase();
    if (
      r.includes('mobile') ||
      r.includes('kodiak') ||
      r.includes('engenheiro de software mobile')
    ) {
      return locale === 'pt-BR' ? 'Mobile Kodiak' : 'Kodiak Mobile';
    }
    return locale === 'pt-BR' ? 'Engenharia de Software' : 'Software Engineering';
  }

  const entry = TEAM_BY_COMPANY[company];
  if (!entry) return company;
  return locale === 'pt-BR' ? entry['pt-BR'] : entry.en;
}

export function jobLocation(company: string, locale: string): string {
  const entry = LOCATION_BY_COMPANY[company];
  if (!entry) {
    return locale === 'pt-BR' ? 'Londrina, Paraná, Brasil' : 'Londrina, Paraná, Brazil';
  }
  return locale === 'pt-BR' ? entry['pt-BR'] : entry.en;
}

export function jobSkills(company: string, role?: string): string[] {
  if (company === 'CASSI') {
    const r = (role || '').toLowerCase();
    if (r.includes('mobile') || r.includes('kodiak') || r.includes('engenheiro de software mobile')) {
      return ['React Native', 'Redux', 'JavaScript', 'Mobile'];
    }
    return ['React Native', '.NET Core', 'Java', 'SQL Server', 'MongoDB', 'Azure DevOps'];
  }
  return SKILLS_BY_COMPANY[company] || [];
}

/** Split a prose description into resume-style bullet points. */
export function toBullets(description: string): string[] {
  const cleaned = description.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  const parts = cleaned
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ú])|(?<=\.)\s+(?=[A-ZÀ-Ú])/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    const bySemi = cleaned
      .split(/;\s+/)
      .map((p) => p.trim())
      .filter(Boolean);
    return bySemi.length > 1 ? bySemi : [cleaned];
  }

  return parts.map((p) => (p.endsWith('.') ? p.slice(0, -1) : p));
}

export function displayLink(url: string | null | undefined): string {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/** Compact one-liner roles (older / shorter stints), Veras-style. */
export function isCompactRole(exp: CvExperience): boolean {
  const olderCompanies = new Set(['Mundo da Web']);
  if (olderCompanies.has(exp.company)) return true;
  if (exp.role.toLowerCase().includes('trainee') || exp.role.toLowerCase().includes('estagi')) {
    return true;
  }
  if (exp.role.toLowerCase().includes('basic') || exp.role.toLowerCase().includes('básico')) {
    return true;
  }
  return false;
}

export function defaultLabels(locale: string): CvLabels {
  if (locale === 'pt-BR') {
    return {
      experience: 'Experience',
      education: 'Education',
      languages: 'Languages',
      skills: 'Skills',
      present: 'Presente',
      location: 'Londrina, Paraná, Brasil',
    };
  }
  return {
    experience: 'Experience',
    education: 'Education',
    languages: 'Languages',
    skills: 'Skills',
    present: 'Present',
    location: 'Londrina, Paraná, Brazil',
  };
}
