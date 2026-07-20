/** Clickable keyword presets for job search — frontend / engineer first. */
export const JOB_KEYWORD_PRESETS = [
  'Frontend Engineer',
  'Frontend Developer',
  'Software Engineer',
  'React',
  'Next.js',
  'TypeScript',
  'React Native',
  'AI Engineer',
  'Full Stack Engineer',
  'Node.js',
  'Vue.js',
] as const;

export function parseKeywordList(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function serializeKeywords(list: string[]): string {
  return list.join(', ');
}

/** Toggle a preset: add, or if already present move to front (LinkedIn uses the first). */
export function toggleKeyword(current: string, preset: string): string {
  const list = parseKeywordList(current);
  const idx = list.findIndex((k) => k.toLowerCase() === preset.toLowerCase());
  if (idx === 0) {
    list.shift();
    return serializeKeywords(list);
  }
  if (idx > 0) {
    list.splice(idx, 1);
    list.unshift(preset);
    return serializeKeywords(list);
  }
  list.unshift(preset);
  return serializeKeywords(list);
}
