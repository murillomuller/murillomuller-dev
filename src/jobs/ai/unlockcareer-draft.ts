import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { cvSnapshotToPrompt, loadCvSnapshot } from './cv-context';
import { candidatePositioningPrompt } from './candidate-positioning';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Draft a short, human Unlock Career cover letter + additional-question answers.
 * Always review before submit — tone should sound like a real engineer, not a template.
 */
export async function draftUnlockCareerApplication(input: {
  job: { title: string; company: string; description: string };
  questions: Array<{ id: string; label: string }>;
  locale?: string;
}): Promise<{
  coverLetter: string;
  answers: Array<{ id: string; answer: string }>;
}> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required to draft Unlock Career applications');
  }

  const cv = await loadCvSnapshot(input.locale === 'pt-BR' ? 'pt-BR' : 'en');
  const cvText = cvSnapshotToPrompt(cv);

  const result = await generateObject({
    model: openai(process.env.OPENAI_MODEL || 'gpt-4o-mini'),
    temperature: 0.55,
    system: `You write job application materials for Murillo Müller, a frontend/full-stack engineer based in Londrina, Paraná, Brazil (occasional hybrid in São Paulo OK).

Tone rules (critical):
- Sound like a real person typing quickly but carefully. Not corporate. Not LinkedIn-influencer.
- Avoid AI tells: "I am excited to", "leverage", "passionate about", "synergy", " furthermore", "In conclusion", buzzword stacks, perfect parallel lists of three.
- Short paragraphs. Concrete employers, stacks, and outcomes from the CV only. Do not invent projects.
- English unless the question is clearly in Portuguese.
- Cover letter: ~120-180 words, addressed casually ("Hi,"), sign with Murillo Müller.
- Additional answers: 120-220 words each, first person, specific.

${candidatePositioningPrompt()}

Facts you may use: React/TypeScript/Next.js, Node when relevant, Puríssima end-to-end ownership (Next.js/PostgreSQL/AWS/CI/CD), Squad AI / Deeploy remote London work, Solfácil Vue/Python/PostgreSQL/Kafka/GraphQL, CASSI React Native 5+ years with Redux/Redux Toolkit and Zustand (Kodiak), hands-on AI tooling (Claude Code, GPT, Gemini, Hermes/Cursor agents, MCP), responsive layouts and modern CSS across the whole career, security and scalability as a standing concern in past work, side projects Purple/GoObra/7Virtual, GitHub github.com/murillomuller.`,
    prompt: JSON.stringify(
      {
        job: input.job,
        questions: input.questions,
        cv: cvText,
        positioning: candidatePositioningPrompt(),
      },
      null,
      2
    ),
    schema: z.object({
      coverLetter: z.string(),
      answers: z.array(
        z.object({
          id: z.string(),
          answer: z.string(),
        })
      ),
    }),
  });

  return result.object;
}
