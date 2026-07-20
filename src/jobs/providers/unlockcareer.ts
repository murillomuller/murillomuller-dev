import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const PROFILE_PATH = path.join(ROOT, 'data/unlockcareer/profile.json');
const APPLICATIONS_DIR = path.join(ROOT, 'data/unlockcareer/applications');

export type UnlockCareerProfile = {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  countryCode: string;
  city?: string;
  state?: string;
  stateCode?: string;
  location?: string;
  hybrid?: { city: string; frequency?: string; note: string };
  phoneCountryDial: string;
  phone: string | null;
  linkedin: string;
  github: string;
  cvPath: string;
  englishProficiency: string;
  englishProficiencyLabel: string;
  availability: string;
  availabilityLabel: string;
  expectedRateUsd: number;
};

export type UnlockCareerApplicationDraft = {
  status: 'awaiting_confirmation' | 'confirmed' | 'submitted' | 'failed';
  job: {
    id: string;
    url: string;
    title: string;
    company: string;
    client?: string;
    compensation?: string;
    workMode?: string;
    postedAt?: string;
  };
  formDefaults: Record<string, string | number | null>;
  coverLetter: string;
  additionalQuestions: Array<{ id: number; label: string; answer: string }>;
  confirmedAt?: string;
  submittedAt?: string;
};

export function loadUnlockCareerProfile(): UnlockCareerProfile {
  const raw = fs.readFileSync(PROFILE_PATH, 'utf8');
  return JSON.parse(raw) as UnlockCareerProfile;
}

export function saveUnlockCareerProfile(profile: UnlockCareerProfile) {
  fs.mkdirSync(path.dirname(PROFILE_PATH), { recursive: true });
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(profile, null, 2) + '\n');
}

export function applicationDraftPath(jobId: string) {
  return path.join(APPLICATIONS_DIR, `${jobId}.json`);
}

export function loadApplicationDraft(jobId: string): UnlockCareerApplicationDraft | null {
  const p = applicationDraftPath(jobId);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8')) as UnlockCareerApplicationDraft;
}

export function saveApplicationDraft(jobId: string, draft: UnlockCareerApplicationDraft) {
  fs.mkdirSync(APPLICATIONS_DIR, { recursive: true });
  fs.writeFileSync(applicationDraftPath(jobId), JSON.stringify(draft, null, 2) + '\n');
}

/** Resolve absolute CV path for Playwright upload. */
export function resolveUnlockCareerCvPath(profile = loadUnlockCareerProfile()): string {
  const p = profile.cvPath;
  return path.isAbsolute(p) ? p : path.join(ROOT, p);
}

export function isUnlockCareerUrl(url: string): boolean {
  try {
    return new URL(url).hostname.includes('unlockcareer.ai');
  } catch {
    return /unlockcareer\.ai/i.test(url);
  }
}

/** Submitted Unlock Career applications (from draft JSON files). */
export function listUnlockCareerSubmitted(): UnlockCareerApplicationDraft[] {
  if (!fs.existsSync(APPLICATIONS_DIR)) return [];
  const files = fs.readdirSync(APPLICATIONS_DIR).filter((f) => f.endsWith('.json'));
  const seen = new Set<string>();
  const out: UnlockCareerApplicationDraft[] = [];
  for (const file of files) {
    try {
      const draft = JSON.parse(
        fs.readFileSync(path.join(APPLICATIONS_DIR, file), 'utf8')
      ) as UnlockCareerApplicationDraft;
      if (draft.status !== 'submitted') continue;
      const key = draft.job?.id || file;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(draft);
    } catch {
      /* ignore bad file */
    }
  }
  return out.sort((a, b) => {
    const ta = a.submittedAt ? Date.parse(a.submittedAt) : 0;
    const tb = b.submittedAt ? Date.parse(b.submittedAt) : 0;
    return tb - ta;
  });
}

/**
 * Map form field keys used by the external apply agent to Unlock Career profile values.
 */
export function unlockCareerValueForKey(key: string, extras?: { coverLetter?: string }): string {
  const p = loadUnlockCareerProfile();
  switch (key) {
    case 'email':
      return p.email;
    case 'phone':
      return p.phone || '';
    case 'name':
      return `${p.firstName} ${p.lastName}`.trim();
    case 'firstName':
      return p.firstName;
    case 'lastName':
      return p.lastName;
    case 'linkedin':
      return p.linkedin.replace(/^https?:\/\/(www\.)?/, '');
    case 'github':
      return p.github.replace(/^https?:\/\/(www\.)?/, '');
    case 'location':
    case 'country':
      return p.location || p.country;
    case 'city':
      return p.city || 'Londrina';
    case 'hybrid':
      return p.hybrid?.note || 'Open to occasional hybrid in São Paulo';
    case 'english':
    case 'englishProficiency':
      return p.englishProficiencyLabel;
    case 'availability':
      return p.availabilityLabel;
    case 'expectedRate':
    case 'salary':
      return String(p.expectedRateUsd);
    case 'coverLetter':
      return extras?.coverLetter || '';
    case 'cvPath':
      return resolveUnlockCareerCvPath(p);
    default:
      return '';
  }
}
