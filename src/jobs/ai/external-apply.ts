import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function decideNextAction(input: {
  url: string;
  title: string;
  headings: string[];
  controls: { tag: string; type?: string; id?: string; name?: string; label?: string; text?: string; selector: string }[];
  job: { title?: string; company?: string; description?: string };
  history: string[];
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for external apply AI');
  }

  const result = await generateObject({
    model: openai('gpt-4o'),
    system: `You are an AI agent helping a user apply for a job on an external ATS site.
You will be provided with the current page URL, title, headings, and a list of interactive controls (inputs, buttons, selects).
You also have the job details and a history of previous actions.
Decide the next action to take to progress the application.
If you need to fill a field, provide the 'valueKey' (e.g. 'email', 'phone', 'name', 'linkedin', 'github', 'location', 'coverLetter', 'cvPath') or a literal 'value'.
If you need to click a button, provide the 'selector'.
If you need to upload a resume, use action 'upload' and selector.
If you see a success message indicating the application was submitted, use action 'done'.
If you are blocked by a CAPTCHA, login, or missing critical information, or the page is an error page, set 'blocked' to true and explain why in 'reason'.`,
    prompt: JSON.stringify(input, null, 2),
    schema: z.object({
      action: z.enum(['click', 'fill', 'upload', 'select', 'done']),
      selector: z.string().describe("Selector to interact with, or empty string"),
      valueKey: z.string().describe("Key for payload value, or empty string"),
      value: z.string().describe("Literal value to fill, or empty string"),
      reason: z.string().describe("Reason for this action"),
      blocked: z.boolean().describe("True if blocked by CAPTCHA/login"),
    }),
  });

  return result.object;
}
