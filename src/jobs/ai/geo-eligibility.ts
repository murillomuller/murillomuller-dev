/**
 * Geographic eligibility for a Brazil-based candidate.
 * Catches "fully remote but must be within EMEA/EU/UK/US" style restrictions.
 */

export const CANDIDATE_GEO = {
  countryCode: 'BR',
  countryNames: ['brazil', 'brasil'],
  regions: ['latam', 'latin america', 'américa latina', 'america latina', 'south america', 'américa do sul', 'americas'],
  city: 'Londrina',
  state: 'Paraná',
  stateCode: 'PR',
  hybridCity: 'São Paulo',
  hybridNote: 'Open to occasional hybrid in São Paulo',
  timezone: 'America/Sao_Paulo',
} as const;

export type GeoEligibility = {
  eligible: boolean;
  /** high = hard skip; medium = penalize / flag; low = ignore */
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  matchedRestriction?: string;
};

/** Regions / countries that do not include Brazil. */
const EXCLUDED_REGION =
  'emea|europe|european\\s+union|\\beu\\b|uk|united\\s+kingdom|united\\s+states|\\busa\\b|u\\.s\\.a\\.?|\\bu\\.s\\.\\b|apac|asia[\\s-]?pacific|canada|australia|india|middle\\s+east|africa';

const EXCLUDED_REGION_PT =
  'europa|união\\s+europeia|reino\\s+unido|estados\\s+unidos|eua|canadá|austrália|índia|oriente\\s+médio|áfrica';

const INCLUSIVE_OVERRIDE =
  /\b(?:latam|latin\s+america|américa\s+latina|america\s+latina|south\s+america|américa\s+do\s+sul|brazil|brasil|americas|worldwide|anywhere|global(?:ly)?|any\s+country|qualquer\s+pa[ií]s)\b/i;

/** Explicit "must be in X" / "only apply if based in X" patterns (high confidence). */
const HARD_RESTRICTION_PATTERNS: RegExp[] = [
  // English — residency / physical base
  new RegExp(
    `(?:must|need\\s+to|have\\s+to|required\\s+to|should)\\s+be\\s+(?:physically\\s+)?(?:based|located|living|residing|situated)\\s+(?:in|within)\\s+(?:the\\s+)?(?:${EXCLUDED_REGION})`,
    'i'
  ),
  new RegExp(
    `(?:please\\s+)?only\\s+apply\\s+if\\s+you\\s+are\\s+(?:physically\\s+)?based\\s+(?:in|within)\\s+(?:the\\s+)?(?:${EXCLUDED_REGION})`,
    'i'
  ),
  new RegExp(
    `(?:candidate|candidates|applicants?)\\s+must\\s+be\\s+(?:physically\\s+)?(?:based|located|within)\\s+(?:in\\s+)?(?:the\\s+)?(?:${EXCLUDED_REGION})`,
    'i'
  ),
  new RegExp(
    `(?:must|need\\s+to)\\s+(?:live|reside|be\\s+located)\\s+in\\s+(?:the\\s+)?(?:${EXCLUDED_REGION})`,
    'i'
  ),
  new RegExp(`(?:physically\\s+)?based\\s+within\\s+(?:the\\s+)?(?:${EXCLUDED_REGION})`, 'i'),
  new RegExp(`within\\s+(?:the\\s+)?(?:${EXCLUDED_REGION})\\s+(?:region|timezone|time\\s*zone)?`, 'i'),
  new RegExp(
    `(?:remote\\s+)?(?:role|position|job)?\\s*(?:is\\s+)?(?:open\\s+)?(?:to\\s+)?(?:${EXCLUDED_REGION})[\\s-]?only`,
    'i'
  ),
  new RegExp(`(?:${EXCLUDED_REGION})[\\s-]only`, 'i'),
  new RegExp(
    `(?:restricted|limited)\\s+to\\s+(?:candidates?\\s+)?(?:in|within)\\s+(?:the\\s+)?(?:${EXCLUDED_REGION})`,
    'i'
  ),
  // Work authorization (not residency, but Brazil candidate typically can't claim these)
  /(?:must|need\s+to)\s+(?:have|hold)\s+(?:valid\s+)?(?:eu|uk|us|u\.s\.|united\s+states|united\s+kingdom)\s+(?:work\s+)?(?:authorization|authorisation|permit|visa)/i,
  /(?:right|eligible|authorized|authorised)\s+to\s+work\s+in\s+(?:the\s+)?(?:uk|eu|united\s+kingdom|united\s+states|usa|u\.s\.a?)/i,
  /(?:no\s+sponsorship|without\s+sponsorship).{0,40}(?:uk|us|eu|united\s+states|united\s+kingdom)/i,
  /(?:uk|us|eu|united\s+states|united\s+kingdom).{0,40}(?:work\s+)?(?:authorization|authorisation|visa).{0,30}required/i,
  // Portuguese
  new RegExp(
    `deve(?:rá)?\\s+(?:estar|residir|morar|ficar)\\s+(?:fisicamente\\s+)?(?:na|no|em)\\s+(?:${EXCLUDED_REGION_PT}|emea)`,
    'i'
  ),
  new RegExp(
    `apenas\\s+(?:candidatos?\\s+)?(?:que\\s+)?(?:estejam|residam|morem)\\s+(?:na|no|em)\\s+(?:${EXCLUDED_REGION_PT}|emea)`,
    'i'
  ),
  new RegExp(
    `somente\\s+(?:para\\s+)?(?:candidatos?\\s+)?(?:da|na|no|em)\\s+(?:${EXCLUDED_REGION_PT}|emea)`,
    'i'
  ),
  /autoriza[cç][aã]o\s+(?:para\s+)?trabalhar\s+(?:no|na|em)\s+(?:reino\s+unido|estados\s+unidos|eua|europa|uni[aã]o\s+europeia)/i,
];

/** Softer signals — region named as target market without clear Brazil inclusion. */
const SOFT_RESTRICTION_PATTERNS: RegExp[] = [
  new RegExp(
    `(?:fully\\s+)?remote.{0,80}(?:must|only|within|based).{0,40}(?:${EXCLUDED_REGION})`,
    'i'
  ),
  new RegExp(`(?:location|based)\\s*:\\s*(?:${EXCLUDED_REGION})\\b`, 'i'),
  /\b(?:emea|apac)\b.{0,30}(?:remote|candidates?|applicants?)/i,
  /\b(?:remote|candidates?|applicants?).{0,30}\b(?:emea|apac)\b/i,
];

function normalizeHaystack(parts: Array<string | undefined | null>): string {
  return parts.filter(Boolean).join('\n').replace(/\s+/g, ' ').trim();
}

function findMatch(hay: string, patterns: RegExp[]): string | undefined {
  for (const re of patterns) {
    const m = hay.match(re);
    if (m?.[0]) return m[0].trim().slice(0, 160);
  }
  return undefined;
}

function mentionsBrazilOrLatam(hay: string): boolean {
  return INCLUSIVE_OVERRIDE.test(hay);
}

function reasonForMatch(matched: string): string {
  const lower = matched.toLowerCase();
  if (/emea/.test(lower)) {
    return 'Vaga exige candidato fisicamente na região EMEA; você está no Brasil.';
  }
  if (/europe|eu\b|europa|união europeia/.test(lower)) {
    return 'Vaga restringe localização à Europa/UE; você está no Brasil.';
  }
  if (/uk|united kingdom|reino unido/.test(lower)) {
    return 'Vaga exige base ou autorização no Reino Unido; você está no Brasil.';
  }
  if (/united states|\busa\b|u\.s|estados unidos|\beua\b/.test(lower)) {
    return 'Vaga exige base ou autorização nos EUA; você está no Brasil.';
  }
  if (/apac|asia/.test(lower)) {
    return 'Vaga restringe candidatos à região APAC; você está no Brasil.';
  }
  if (/authori[sz]ation|visa|autoriza/.test(lower)) {
    return 'Vaga exige autorização de trabalho em país onde você não reside (Brasil).';
  }
  return `Vaga com restrição geográfica incompatível com o Brasil (${matched.slice(0, 80)}).`;
}

/**
 * Assess whether a Brazil-based candidate can realistically apply.
 * Pure heuristics — no LLM call.
 */
export function assessGeoEligibility(input: {
  title?: string;
  location?: string;
  description?: string;
}): GeoEligibility {
  const hay = normalizeHaystack([input.title, input.location, input.description]);
  if (!hay || hay.length < 20) {
    return { eligible: true, confidence: 'low', reason: 'Descrição insuficiente para avaliar localização.' };
  }

  const hard = findMatch(hay, HARD_RESTRICTION_PATTERNS);
  if (hard) {
    // Explicit override: "EMEA or LATAM", "Brazil welcome", etc.
    if (mentionsBrazilOrLatam(hay) && /(?:or|e|and|,)\s*(?:latam|brazil|brasil|latin)/i.test(hay)) {
      return {
        eligible: true,
        confidence: 'medium',
        reason: 'Há restrição regional, mas a vaga também menciona LATAM/Brasil.',
        matchedRestriction: hard,
      };
    }
    return {
      eligible: false,
      confidence: 'high',
      reason: reasonForMatch(hard),
      matchedRestriction: hard,
    };
  }

  const soft = findMatch(hay, SOFT_RESTRICTION_PATTERNS);
  if (soft) {
    if (mentionsBrazilOrLatam(hay)) {
      return {
        eligible: true,
        confidence: 'low',
        reason: 'Menção a região restrita, mas também há sinal de LATAM/Brasil/global.',
        matchedRestriction: soft,
      };
    }
    return {
      eligible: false,
      confidence: 'medium',
      reason: reasonForMatch(soft),
      matchedRestriction: soft,
    };
  }

  return {
    eligible: true,
    confidence: 'low',
    reason: 'Sem restrição geográfica clara incompatível com o Brasil.',
  };
}

/** Apply geo result onto a fit analysis: hard skip or score penalty. */
export function applyGeoToFit<T extends {
  score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  recommendation: 'strong_fit' | 'possible' | 'weak_fit' | 'skip';
}>(fit: T, geo: GeoEligibility): T {
  if (geo.eligible) {
    if (geo.matchedRestriction && geo.confidence === 'medium') {
      return {
        ...fit,
        gaps: [...fit.gaps, geo.reason].slice(0, 4),
      };
    }
    return fit;
  }

  if (geo.confidence === 'high') {
    return {
      ...fit,
      score: Math.min(fit.score, 10),
      summary: geo.reason,
      strengths: fit.strengths.slice(0, 2),
      gaps: [geo.reason, ...fit.gaps.filter((g) => g !== geo.reason)].slice(0, 4),
      recommendation: 'skip',
    };
  }

  // medium: penalize but don't always force skip if stack is excellent
  const score = Math.min(fit.score, Math.max(0, fit.score - 35));
  const recommendation =
    score < 45 ? 'skip' : score < 65 ? 'weak_fit' : fit.recommendation === 'strong_fit' ? 'possible' : fit.recommendation;

  return {
    ...fit,
    score,
    summary: `${geo.reason} ${fit.summary}`.trim().slice(0, 500),
    gaps: [geo.reason, ...fit.gaps.filter((g) => g !== geo.reason)].slice(0, 4),
    recommendation,
  };
}
