export type JobCvLocale = 'en' | 'pt-BR';

export type JobLanguageDetection = {
  /** Set only when confidence is clear. */
  locale: JobCvLocale | null;
  confidence: 'clear' | 'ambiguous';
  enScore: number;
  ptScore: number;
};

const PT_MARKERS = [
  /\bsobre a vaga\b/i,
  /\brequisitos?\b/i,
  /\bresponsabilidades?\b/i,
  /\bbenef[ií]cios?\b/i,
  /\bcandidatura\b/i,
  /\bexperi[eê]ncia\b/i,
  /\banos de\b/i,
  /\bdesej[aá]vel\b/i,
  /\bobrigat[oó]ri[oa]\b/i,
  /\bforma[cç][aã]o\b/i,
  /\bconhecimentos?\b/i,
  /\bestamos (buscando|procurando)\b/i,
  /\bvaga\b/i,
  /\bempresa\b/i,
  /\bremoto\b/i,
  /\bh[ií]brido\b/i,
  /\bpresencial\b/i,
  /\bpretens[aã]o\b/i,
  /\bsal[aá]rio\b/i,
  /\bqualifica[cç][oõ]es\b/i,
  /\bdiferenciais?\b/i,
  /\batribui[cç][oõ]es\b/i,
];

const EN_MARKERS = [
  /\babout the (job|role|position)\b/i,
  /\brequirements?\b/i,
  /\bresponsibilities\b/i,
  /\bbenefits?\b/i,
  /\bwe are looking\b/i,
  /\byears of experience\b/i,
  /\bmust[- ]have\b/i,
  /\bnice[- ]to[- ]have\b/i,
  /\bqualifications?\b/i,
  /\bjob description\b/i,
  /\bwhat you(?:'| wi)?ll (do|bring)\b/i,
  /\bremote\b/i,
  /\bhybrid\b/i,
  /\bon[- ]site\b/i,
  /\bfull[- ]time\b/i,
];

/** Minimum score gap to treat language as clear (not tied/ambiguous). */
const CLEAR_MARGIN = 2;

/** Count Portuguese-specific letters (ãõáéíóúç) as a soft signal. */
function countPtChars(text: string): number {
  return (text.match(/[ãõáéíóúâêôàüç]/gi) || []).length;
}

function scoreLanguage(text: string): { enScore: number; ptScore: number } {
  let ptScore = countPtChars(text) * 0.5;
  let enScore = 0;

  for (const re of PT_MARKERS) {
    if (re.test(text)) ptScore += 2;
  }
  for (const re of EN_MARKERS) {
    if (re.test(text)) enScore += 2;
  }

  const enWords = (text.match(/\b(the|and|with|for|our|you|your|will|this|that|are|have)\b/gi) || [])
    .length;
  const ptWords = (
    text.match(/\b(de|da|do|das|dos|para|com|uma|um|seu|sua|nossa|nosso|voce|você)\b/gi) || []
  ).length;
  enScore += Math.min(8, enWords * 0.15);
  ptScore += Math.min(8, ptWords * 0.15);

  return { enScore, ptScore };
}

/**
 * Detect whether a job posting is primarily English or Portuguese.
 * Returns ambiguous when signals are weak, tied, or missing — caller must ask the user.
 */
export function detectJobCvLocale(input: {
  title?: string | null;
  description?: string | null;
}): JobLanguageDetection {
  const text = `${input.title || ''}\n${input.description || ''}`.trim();
  if (!text) {
    return { locale: null, confidence: 'ambiguous', enScore: 0, ptScore: 0 };
  }

  const { enScore, ptScore } = scoreLanguage(text);
  const gap = Math.abs(enScore - ptScore);

  if (gap < CLEAR_MARGIN || (enScore < 2 && ptScore < 2)) {
    return { locale: null, confidence: 'ambiguous', enScore, ptScore };
  }

  return {
    locale: enScore > ptScore ? 'en' : 'pt-BR',
    confidence: 'clear',
    enScore,
    ptScore,
  };
}
