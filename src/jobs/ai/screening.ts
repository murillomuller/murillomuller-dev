import { cvSnapshotToPrompt, loadCvSnapshot } from './cv-context';
import { candidatePositioningPrompt } from './candidate-positioning';

export type ScreeningField = {
  id: string;
  kind: 'text' | 'number' | 'textarea' | 'select' | 'radio' | 'checkbox';
  label: string;
  required?: boolean;
  options?: string[];
  currentValue?: string;
};

export type ScreeningAnswer = {
  id: string;
  value: string;
  reason?: string;
};

function getModel() {
  return process.env.OPENAI_MODEL || 'gpt-4o-mini';
}

/** Placeholder / unset values LinkedIn shows — treat as unanswered. */
export function isUnsetScreeningValue(value?: string): boolean {
  const v = (value || '').trim();
  if (!v) return true;
  if (
    /^(select(\s+an)?\s+option|selecione(\u2026|\.\.\.)?|selecionar(\s+uma)?\s+op[cç][aã]o|choose|select|none)$/i.test(
      v
    )
  ) {
    return true;
  }
  if (/select an option|selecionar uma op|selecione/i.test(v)) return true;
  return false;
}

/**
 * Known answers for Murillo from CV — used by heuristics and as OpenAI fact sheet.
 * Keep in sync with real experience.
 */
export const SCREENING_FACT_SHEET = `
CANDIDATE FACT SHEET (Murillo Müller) — use these when answering Easy Apply questions:
- Location: Londrina, Paraná, Brazil. Occasional hybrid in São Paulo OK. Available immediately.
- English: Professional (LinkedIn options None/Conversational/Professional/Native or bilingual → pick Professional). Also maps to Professional working proficiency / Upper Intermediate B2.
- React.js years: 8
- Next.js years (any phrasing: Next.js, professional Next.js): 5
- TailwindCSS years: 1 (since Deeploy → Squad AI, Jun 2025; also Puríssima)
- Redux years: 5
- Redux Toolkit / Zustand: yes (CASSI Kodiak)
- Production-ready web applications years: 10
- JavaScript years: 10
- TypeScript years: 7
- Git / GitHub years: 10
- React Native years: 5+
- Sanity CMS years: 0 (not used)
- Next.js Page Router in production: Yes
- getServerSideProps / getStaticProps / getStaticPaths: Yes
- Dynamic routes and nested layouts with Page Router: Yes
- Next.js API Routes: Yes
- Proficiency with web apps + JavaScript + React frameworks: Yes
- Can start immediately: Yes
- Remote work: Yes
- Unit / E2E tests: Yes (CASSI, Squad, Puríssima)
- Micro frontends + design patterns: Yes (CASSI)
- Sentry: Yes (Inmetrics). New Relic: No
- AI tooling (hands-on): Claude Code, ChatGPT/GPT, Google Gemini, Cursor, Hermes and similar coding agents, MCP (Model Context Protocol)
- Experience building/using AI agents and MCP tools: Yes
`.trim();

function pickOption(opts: string[], ...prefer: RegExp[]): string | undefined {
  for (const re of prefer) {
    const hit = opts.find((o) => re.test(o.trim()));
    if (hit) return hit;
  }
  return undefined;
}

/** Heuristic fallback when OpenAI is unavailable. */
export function heuristicScreeningAnswers(fields: ScreeningField[]): ScreeningAnswer[] {
  return fields.map((f) => {
    const label = f.label.toLowerCase();
    const kind = f.kind;
    const opts = (f.options || []).filter((o) => !isUnsetScreeningValue(o));
    const pickNo = () => opts.find((o) => /^(no|não)$/i.test(o.trim()));
    const pickYes = () => opts.find((o) => /^(yes|sim)$/i.test(o.trim()));

    if (/work\s+authori[sz]ation|visa|eligible\s+to\s+work|right\s+to\s+work/i.test(label)) {
      if (kind === 'select' || kind === 'radio') {
        return { id: f.id, value: pickNo() || opts[0] || 'No', reason: 'heuristic-no-visa' };
      }
      return { id: f.id, value: 'No — based in Brazil', reason: 'heuristic-no-visa' };
    }
    if (
      /\b(emea|europe|eu|uk|united\s+states|usa)\b/i.test(label) &&
      /based|located|live|reside|within/i.test(label)
    ) {
      if (kind === 'select' || kind === 'radio') {
        return { id: f.id, value: pickNo() || opts[0] || 'No', reason: 'heuristic-not-in-region' };
      }
      return { id: f.id, value: 'No — I am based in Brazil (LATAM)', reason: 'heuristic-not-in-region' };
    }
    if (/cidade|city|location|localiza|where\s+do\s+you\s+(?:live|reside)/i.test(label)) {
      if (kind === 'select' || kind === 'radio') {
        const br = opts.find((o) => /brazil|brasil|londrina|latam|remote|remoto/i.test(o));
        return { id: f.id, value: br || opts[0] || 'Brazil', reason: 'heuristic-city' };
      }
      return { id: f.id, value: 'Londrina, Paraná, Brazil', reason: 'heuristic-city' };
    }
    if (/country|pa[ií]s|based\s+in|reside/i.test(label) && (kind === 'text' || kind === 'textarea')) {
      return { id: f.id, value: 'Brazil', reason: 'heuristic-country' };
    }

    // English proficiency (Bucksense: None / Conversational / Professional / Native or bilingual)
    if (/english|ingl[eê]s|proficiency in english/i.test(label)) {
      if (kind === 'select' || kind === 'radio') {
        const v =
          pickOption(
            opts,
            /^professional$/i,
            /professional working/i,
            /full professional/i,
            /upper intermediate|b2|advanced|c1/i,
            /native or bilingual/i,
            /conversational/i
          ) ||
          opts.find((o) => !/^none$/i.test(o)) ||
          'Professional';
        return { id: f.id, value: v, reason: 'heuristic-english' };
      }
      return { id: f.id, value: 'Professional', reason: 'heuristic-english' };
    }

    // Years questions
    if (/years|anos|how many/i.test(label)) {
      if (/sanity/i.test(label)) return { id: f.id, value: '0', reason: 'heuristic-sanity' };
      if (/react(\.?js)?/i.test(label) && !/native/i.test(label))
        return { id: f.id, value: '8', reason: 'heuristic-react-years' };
      if (/react\s*native/i.test(label)) return { id: f.id, value: '5', reason: 'heuristic-rn-years' };
      if (/next\.?js/i.test(label)) return { id: f.id, value: '5', reason: 'heuristic-next-years' };
      if (/tailwind/i.test(label)) return { id: f.id, value: '1', reason: 'heuristic-tw-years' };
      if (/redux/i.test(label)) return { id: f.id, value: '5', reason: 'heuristic-redux-years' };
      if (/typescript/i.test(label)) return { id: f.id, value: '7', reason: 'heuristic-ts-years' };
      if (/javascript/i.test(label)) return { id: f.id, value: '10', reason: 'heuristic-js-years' };
      if (/node/i.test(label)) return { id: f.id, value: '7', reason: 'heuristic-node-years' };
      if (/git(hub)?/i.test(label)) return { id: f.id, value: '10', reason: 'heuristic-git-years' };
      if (/production|web application|professional experience developing/i.test(label))
        return { id: f.id, value: '10', reason: 'heuristic-web-years' };
      return { id: f.id, value: '5', reason: 'heuristic-years' };
    }

    // Yes/No skill questions (Next.js patterns, start immediately, JS/React proficiency)
    if (kind === 'select' || kind === 'radio') {
      const yesLikely =
        /page router|getserversideprops|getstaticprops|getstaticpaths|dynamic routes|nested layouts|api routes|javascript and react|react frameworks|start immediately|available immediately|remote|claude|chatgpt|gpt|gemini|mcp|model context protocol|ai agent|coding agent|hermes|cursor ai|llm|generative ai|genai/i.test(
          label
        );
      if (yesLikely) {
        return { id: f.id, value: pickYes() || 'Yes', reason: 'heuristic-yes' };
      }
      const yes = pickYes();
      const prefer = opts.find((o) => /remote|remoto|brazil|brasil|authorized|autorizad/i.test(o));
      return { id: f.id, value: prefer || yes || opts[0] || '', reason: 'heuristic-select' };
    }

    if (/react(\.?js)?/i.test(label) && !/native/i.test(label))
      return { id: f.id, value: '8', reason: 'heuristic-react' };
    if (/next\.?js/i.test(label)) return { id: f.id, value: '5', reason: 'heuristic-next' };
    if (/typescript/i.test(label)) return { id: f.id, value: '7', reason: 'heuristic-ts' };
    if (/javascript/i.test(label)) return { id: f.id, value: '10', reason: 'heuristic-js' };
    if (/node/i.test(label)) return { id: f.id, value: '7', reason: 'heuristic-node' };
    if (/github|git\b/i.test(label)) return { id: f.id, value: '10', reason: 'heuristic-git' };
    if (/python/i.test(label)) return { id: f.id, value: '4', reason: 'heuristic-python' };
    if (/sanity/i.test(label)) return { id: f.id, value: '0', reason: 'heuristic-sanity' };
    if (/salary|salário|pretensão|compensation/i.test(label)) {
      return { id: f.id, value: 'A combinar', reason: 'heuristic-salary' };
    }
    if (kind === 'textarea' || kind === 'text' || kind === 'number') {
      return {
        id: f.id,
        value: kind === 'number' ? '5' : 'Experienced with React, Next.js, TypeScript; available to start immediately.',
        reason: 'heuristic-text',
      };
    }
    return { id: f.id, value: f.currentValue && !isUnsetScreeningValue(f.currentValue) ? f.currentValue : '5', reason: 'heuristic-default' };
  });
}

function matchSelectOption(options: string[], raw: string): string | null {
  const v = String(raw).trim();
  if (!v || !options.length) return null;
  const exact = options.find((o) => o === v) || options.find((o) => o.toLowerCase() === v.toLowerCase());
  if (exact) return exact;
  // AI may say "Professional working proficiency" but options are "Professional"
  const partial = options.find(
    (o) =>
      v.toLowerCase().includes(o.toLowerCase()) || o.toLowerCase().includes(v.toLowerCase().split(/\s+/)[0])
  );
  if (partial && !isUnsetScreeningValue(partial) && !/^none$/i.test(partial)) return partial;
  return null;
}

/**
 * Ask OpenAI to answer Easy Apply screening questions using the candidate CV.
 * Falls back to heuristics if the API key is missing or the call fails.
 */
export async function answerScreeningQuestions(input: {
  fields: ScreeningField[];
  job?: { title?: string; company?: string; description?: string; location?: string };
  locale?: string;
  /** Answer all fields even if currentValue looks filled (used by review panel). */
  forceAll?: boolean;
}): Promise<ScreeningAnswer[]> {
  const unanswered = input.forceAll
    ? input.fields
    : input.fields.filter((f) => isUnsetScreeningValue(f.currentValue));
  if (unanswered.length === 0) return [];

  // Treat as empty for the model so it does not keep Select/None placeholders
  const toAnswer = unanswered.map((f) => ({
    ...f,
    currentValue: input.forceAll ? '' : f.currentValue,
  }));

  if (!process.env.OPENAI_API_KEY) {
    console.log('[AI] screening — no OPENAI_API_KEY, using heuristics');
    return heuristicScreeningAnswers(toAnswer);
  }

  try {
    const cv = await loadCvSnapshot(input.locale === 'pt-BR' ? 'pt-BR' : 'en');
    const cvText = cvSnapshotToPrompt(cv);
    const job = input.job || {};

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: getModel(),
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You answer LinkedIn Easy Apply / screening questions for Murillo Müller.
Return ONLY JSON:
{
  "answers": [
    { "id": string, "value": string, "reason": string }
  ]
}

${SCREENING_FACT_SHEET}

Rules:
- Answer EVERY question id provided. Never leave Select/Selecione/None as the answer when a real option exists.
- For select/radio: value MUST be exactly one of the provided options (copy verbatim). Prefer "Professional" over "None" for English. Prefer "Yes" over "No" when the fact sheet supports it.
- Years questions: digits only (0-99), from the fact sheet.
- Sanity → 0. React.js → 8. Next.js → 5. Tailwind → 1. Redux → 5. Production web → 10.
- Do not invent employers. Use the CV + fact sheet.
- Portuguese questions → Portuguese short answers; English questions → English.`,
          },
          {
            role: 'user',
            content: [
              candidatePositioningPrompt(),
              `CANDIDATE CV:\n${cvText}`,
              '',
              `JOB:\nTitle: ${job.title || 'n/a'}\nCompany: ${job.company || 'n/a'}\nLocation: ${job.location || 'n/a'}\nDescription:\n${(job.description || '').slice(0, 3500)}`,
              '',
              `QUESTIONS (answer all; treat currentValue Select/Selecione/None as empty):\n${JSON.stringify(toAnswer, null, 2)}`,
            ].join('\n'),
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[AI] screening OpenAI error', res.status, errText.slice(0, 300));
      return heuristicScreeningAnswers(toAnswer);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content) as { answers?: ScreeningAnswer[] };
    const answers = Array.isArray(parsed.answers) ? parsed.answers : [];

    const byId = new Map(answers.map((a) => [a.id, a]));
    const fallback = heuristicScreeningAnswers(toAnswer);
    return toAnswer.map((f) => {
      const ai = byId.get(f.id);
      const fb = fallback.find((x) => x.id === f.id);
      if (ai && ai.value != null && String(ai.value).trim() !== '' && !isUnsetScreeningValue(ai.value)) {
        if ((f.kind === 'select' || f.kind === 'radio') && f.options?.length) {
          const match = matchSelectOption(f.options, String(ai.value));
          if (match) return { ...ai, value: match };
          // Never keep None if we have a better fallback
          if (fb && !/^none$/i.test(fb.value)) return fb;
          return { ...ai, value: match || fb?.value || ai.value };
        }
        return ai;
      }
      return fb || { id: f.id, value: '5', reason: 'fallback' };
    });
  } catch (err) {
    console.error('[AI] screening failed', err);
    return heuristicScreeningAnswers(toAnswer);
  }
}
