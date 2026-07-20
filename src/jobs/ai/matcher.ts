import { db } from '@/db';
import { applications, jobs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cvSnapshotToPrompt, loadCvSnapshot } from './cv-context';
import { applyGeoToFit, assessGeoEligibility } from './geo-eligibility';
import { candidatePositioningPrompt } from './candidate-positioning';

export type FitAnalysis = {
  score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  recommendation: 'strong_fit' | 'possible' | 'weak_fit' | 'skip';
};

function getModel() {
  return process.env.OPENAI_MODEL || 'gpt-4o-mini';
}

export async function analyzeJobFit(input: {
  title: string;
  company: string;
  location?: string;
  description?: string;
  salaryText?: string | null;
}): Promise<FitAnalysis> {
  const cv = await loadCvSnapshot('en');
  const cvText = cvSnapshotToPrompt(cv);
  const geo = assessGeoEligibility({
    title: input.title,
    location: input.location,
    description: input.description,
  });

  // Hard geo mismatch: skip without spending tokens on stack fit
  if (!geo.eligible && geo.confidence === 'high') {
    console.log('[AI] geo skip', geo.matchedRestriction);
    return applyGeoToFit(
      {
        score: 10,
        summary: geo.reason,
        strengths: [],
        gaps: [geo.reason],
        recommendation: 'skip' as const,
      },
      geo
    );
  }

  let fit: FitAnalysis;

  if (!process.env.OPENAI_API_KEY) {
    console.log('[AI] OPENAI_API_KEY missing — heuristic score');
    const hay = `${input.title} ${input.description || ''}`.toLowerCase();
    let score = 50;
    for (const k of ['react', 'next', 'node', 'typescript', 'javascript', 'mobile', 'fullstack']) {
      if (hay.includes(k)) score += 6;
    }
    score = Math.min(92, score);
    fit = {
      score,
      summary: 'Score heurístico (sem OPENAI_API_KEY). Configure a chave para análise real.',
      strengths: [],
      gaps: [],
      recommendation: score >= 75 ? 'possible' : 'weak_fit',
    };
  } else {
    const jobBlock = [
      `Title: ${input.title}`,
      `Company: ${input.company}`,
      `Location: ${input.location || 'n/a'}`,
      `Salary: ${input.salaryText || 'n/a'}`,
      `Description:\n${(input.description || '').slice(0, 6000) || '(only title/company available)'}`,
    ].join('\n');

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: getModel(),
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a senior tech recruiter. Compare a candidate CV to a job posting.
The candidate lives in Londrina, Paraná, Brazil (NOT Brasília). Occasional hybrid in São Paulo is OK. Remote Brazil is fine.
Remote roles that REQUIRE living in EMEA/EU/UK/US (residency/timezone-only there) are NOT eligible — recommend "skip".
Return ONLY JSON with:
{
  "score": number 0-100,
  "summary": string (2-3 sentences in Portuguese),
  "strengths": string[] (max 4, Portuguese),
  "gaps": string[] (max 4, Portuguese),
  "recommendation": "strong_fit" | "possible" | "weak_fit" | "skip"
}
Rules:
- Do not invent CV experience. Follow CANDIDATE POSITIONING facts strictly.
- Never say he lives in Brasília. Never list Git, micro frontends, design patterns, unit/E2E testing, or Sentry as gaps. Never say he lacks 5+ years of React Native.
- New Relic only if the job requires it specifically (he used Sentry, not New Relic) — soft gap at most.
- Penalize clear mismatches (e.g. senior Java backend-only if CV is React-focused).
- Reward stack overlap (React, React Native, Next.js, Node, TypeScript, micro frontends, testing, Sentry, etc.).
- When the job stresses security and/or scalability, treat his standing care for both as a strength — do not list as gaps unless a specific tool he never used is required.
- Geographic hard blocks (must be within EMEA/EU/UK/US, local work visa required): recommendation "skip", score <= 15, mention it in summary/gaps.
- "Fully remote" / Brazil remote alone is fine if no regional residency restriction.
- Native iOS/Android requirements: soft gap only (limited native; strong React Native), not "zero mobile".
- score >= 80 strong_fit, 65-79 possible, 45-64 weak_fit, <45 skip.`,
          },
          {
            role: 'user',
            content: `${candidatePositioningPrompt()}\n\nCANDIDATE CV:\n${cvText}\n\nJOB:\n${jobBlock}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[AI] OpenAI error', res.status, errText.slice(0, 300));
      throw new Error(`OpenAI error ${res.status}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content) as Partial<FitAnalysis>;

    const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
    fit = {
      score,
      summary: parsed.summary || '',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 4) : [],
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps.slice(0, 4) : [],
      recommendation:
        parsed.recommendation ||
        (score >= 80 ? 'strong_fit' : score >= 65 ? 'possible' : score >= 45 ? 'weak_fit' : 'skip'),
    };
  }

  return applyGeoToFit(fit, geo);
}

export function serializeFitReasons(fit: FitAnalysis): string {
  return JSON.stringify(fit);
}

export function parseFitReasons(raw: string | null | undefined): FitAnalysis | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FitAnalysis;
    if (typeof parsed.score !== 'number') return null;
    return parsed;
  } catch {
    return {
      score: 0,
      summary: raw,
      strengths: [],
      gaps: [],
      recommendation: 'possible',
    };
  }
}

/**
 * Ensure application has a fit score. Skips if score already exists unless force=true.
 */
export async function ensureJobFitScore(
  jobId: number,
  opts?: { force?: boolean }
): Promise<FitAnalysis | null> {
  const job = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1).then((r) => r[0]);
  if (!job) return null;

  let app = await db
    .select()
    .from(applications)
    .where(eq(applications.jobId, jobId))
    .limit(1)
    .then((r) => r[0]);

  if (!app) {
    const [created] = await db
      .insert(applications)
      .values({ jobId, status: 'discovered' })
      .returning();
    app = created;
  }

  if (app.matchScore != null && !opts?.force) {
    const existing =
      parseFitReasons(app.matchReasons) ||
      ({
        score: app.matchScore,
        summary: app.matchReasons || '',
        strengths: [],
        gaps: [],
        recommendation: 'possible' as const,
      } satisfies FitAnalysis);

    // Re-check geo even on cached scores (e.g. EMEA-only remote missed earlier)
    const description = job.descriptionFull || job.descriptionSummary || '';
    const geo = assessGeoEligibility({
      title: job.title,
      location: job.location,
      description,
    });
    if (!geo.eligible && geo.confidence === 'high' && existing.recommendation !== 'skip') {
      const fit = applyGeoToFit(existing, geo);
      await db
        .update(applications)
        .set({
          matchScore: fit.score,
          matchReasons: serializeFitReasons(fit),
          status: 'skipped',
          updatedAt: Date.now(),
        })
        .where(eq(applications.id, app.id));
      return fit;
    }

    return existing;
  }

  // If we just got a full description and previous score was thin, allow refresh via force from caller
  const description = job.descriptionFull || job.descriptionSummary || '';
  console.log('[AI] analyzing fit for job', jobId, job.title);

  const fit = await analyzeJobFit({
    title: job.title,
    company: job.company,
    location: job.location,
    description,
    salaryText: job.salaryText,
  });

  await db
    .update(applications)
    .set({
      matchScore: fit.score,
      matchReasons: serializeFitReasons(fit),
      status: fit.recommendation === 'skip' ? 'skipped' : 'matched',
      updatedAt: Date.now(),
    })
    .where(eq(applications.id, app.id));

  return fit;
}

/** Soft rewrite of professional summary for a job (used by worker). */
export async function adaptCvForJob(
  job: { title: string; company: string; descriptionFull?: string | null },
  _profile: unknown,
  originalAbout: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return originalAbout;
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: getModel(),
        messages: [
          {
            role: 'system',
            content:
              `You are a career coach. Rewrite the professional summary slightly to align with the job without inventing facts. Return only the new summary text.\n\n${candidatePositioningPrompt()}`,
          },
          {
            role: 'user',
            content: `Original Summary: ${originalAbout}\nJob: ${job.title} at ${job.company}\nDescription: ${(job.descriptionFull || '').slice(0, 2000)}`,
          },
        ],
      }),
    });
    const data = await res.json();
    return (data.choices?.[0]?.message?.content || originalAbout).trim();
  } catch (error) {
    console.error('AI Adapt Error:', error);
    return originalAbout;
  }
}
