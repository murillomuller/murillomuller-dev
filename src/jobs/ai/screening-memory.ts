import { db } from '@/db';
import { screeningMemory } from '@/db/schema';
import { eq } from 'drizzle-orm';

export function normalizeQuestionKey(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

export async function recallScreeningAnswer(label: string): Promise<string | null> {
  const key = normalizeQuestionKey(label);
  if (!key) return null;
  const row = await db
    .select()
    .from(screeningMemory)
    .where(eq(screeningMemory.questionKey, key))
    .limit(1)
    .then((r) => r[0]);
  if (!row) return null;
  await db
    .update(screeningMemory)
    .set({ useCount: row.useCount + 1, updatedAt: Date.now() })
    .where(eq(screeningMemory.id, row.id));
  return row.answer;
}

export async function learnScreeningAnswer(input: {
  label: string;
  answer: string;
  kind?: string;
  options?: string[];
  source?: 'user' | 'ai' | 'seed';
}) {
  const key = normalizeQuestionKey(input.label);
  const answer = String(input.answer || '').trim();
  if (!key || !answer) return;

  const existing = await db
    .select()
    .from(screeningMemory)
    .where(eq(screeningMemory.questionKey, key))
    .limit(1)
    .then((r) => r[0]);

  if (existing) {
    await db
      .update(screeningMemory)
      .set({
        answer,
        labelSample: input.label.slice(0, 240),
        kind: input.kind || existing.kind,
        optionsJson: input.options ? JSON.stringify(input.options) : existing.optionsJson,
        source: input.source || existing.source,
        useCount: existing.useCount + 1,
        updatedAt: Date.now(),
      })
      .where(eq(screeningMemory.id, existing.id));
    return;
  }

  await db.insert(screeningMemory).values({
    questionKey: key,
    labelSample: input.label.slice(0, 240),
    kind: input.kind || 'text',
    answer,
    optionsJson: input.options ? JSON.stringify(input.options) : null,
    source: input.source || 'user',
    useCount: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export async function learnMany(
  answers: Array<{ label: string; answer: string; kind?: string; options?: string[] }>,
  source: 'user' | 'ai' | 'seed' = 'user'
) {
  for (const a of answers) {
    await learnScreeningAnswer({ ...a, source });
  }
}

/** Seed common defaults once (English B2, Brazil, etc.). */
export async function seedScreeningMemoryDefaults() {
  const defaults = [
    {
      label: 'What is your level of proficiency in English?',
      answer: 'Professional working proficiency',
      kind: 'select',
      options: [
        'Elementary proficiency',
        'Limited working proficiency',
        'Professional working proficiency',
        'Full professional proficiency',
        'Native or bilingual proficiency',
      ],
    },
    {
      label: 'English Proficiency',
      answer: 'Upper Intermediate (B2)',
      kind: 'select',
    },
    {
      label: 'Are you willing to work remotely?',
      answer: 'Yes',
      kind: 'select',
    },
    {
      label: 'Where are you located?',
      answer: 'Londrina, Paraná, Brazil',
      kind: 'text',
    },
    {
      label: 'City',
      answer: 'Londrina',
      kind: 'text',
    },
    {
      label: 'Country',
      answer: 'Brazil',
      kind: 'text',
    },
  ];
  for (const d of defaults) {
    const key = normalizeQuestionKey(d.label);
    const exists = await db
      .select({ id: screeningMemory.id })
      .from(screeningMemory)
      .where(eq(screeningMemory.questionKey, key))
      .limit(1)
      .then((r) => r[0]);
    if (!exists) {
      await learnScreeningAnswer({ ...d, source: 'seed' });
    }
  }
}
