/**
 * Standing positioning for Murillo when adapting applications / scoring fit.
 */
export const CANDIDATE_POSITIONING = {
  location: 'Londrina, Paraná, Brazil',
  hybrid: 'Open to occasional hybrid in São Paulo (a few times when needed). Remote Brazil is preferred.',
  reactNative: '5+ years professional React Native (CASSI Kodiak via Inmetrics and current role).',
  git: 'Uses Git daily on every project (GitHub/GitLab/Azure DevOps). Never list Git as a gap.',
  microFrontends: 'Worked with micro frontends and design patterns at CASSI (web/mobile architecture).',
  testing: 'Unit and E2E testing experience at CASSI, Squad AI, and Puríssima (Jest and related tooling).',
  sentry: 'Used Sentry for error monitoring at Inmetrics (CASSI allocation).',
  aiTooling: `Hands-on daily with AI coding tools and agents: Claude Code, ChatGPT/GPT, Google Gemini, Cursor, Hermes and similar coding agents, plus MCP (Model Context Protocol) servers/tools. Uses them to accelerate delivery and to build AI-assisted product features — not a theoretical interest.`,
  nativeMobile:
    'Some exposure to native iOS/Android (debugging, store builds, bridging with React Native) but primary mobile stack is React Native — do not claim deep native-only Swift/Kotlin expertise.',
  securityScalability: `Across past roles (CASSI, Puríssima, Solfácil, Squad AI and earlier), Murillo has always treated security and scalability as part of the job — not afterthoughts. He thinks about auth and data exposure, keeps APIs and data models practical for growth, and ships with CI/CD so releases stay reliable.`,
} as const;

/** Extra block appended to CV prompts for AI drafting/matching. */
export function candidatePositioningPrompt(): string {
  return [
    'CANDIDATE POSITIONING (always true — do not contradict):',
    `- Lives in ${CANDIDATE_POSITIONING.location}. NOT Brasília. NOT UK/EU/US.`,
    `- Hybrid: ${CANDIDATE_POSITIONING.hybrid}`,
    `- React Native: ${CANDIDATE_POSITIONING.reactNative}`,
    `- Git: ${CANDIDATE_POSITIONING.git}`,
    `- Micro frontends / design patterns: ${CANDIDATE_POSITIONING.microFrontends}`,
    `- Testing: ${CANDIDATE_POSITIONING.testing}`,
    `- Monitoring: ${CANDIDATE_POSITIONING.sentry}`,
    `- AI tooling / agents / MCP: ${CANDIDATE_POSITIONING.aiTooling}`,
    `- Native mobile: ${CANDIDATE_POSITIONING.nativeMobile}`,
    `- Security & scalability: ${CANDIDATE_POSITIONING.securityScalability}`,
    'FIT / GAPS RULES:',
    '- Do NOT invent that he lives in Brasília. Past employers in Brasília ≠ current residence.',
    '- Brazil remote jobs: location is NOT a gap.',
    '- São Paulo hybrid: NOT a hard gap — he can go occasionally. Only note travel/frequency if relevant.',
    '- UK/EU/US residency-required roles: real geo gap / skip.',
    '- Do NOT list "faltam 5+ anos de React Native" — he has 5+ years.',
    '- Do NOT list Git, micro frontends, design patterns, unit/E2E testing, or Sentry as gaps — he has them.',
    '- Do NOT list Claude Code, GPT/ChatGPT, Gemini, AI agents (Hermes/Cursor), or MCP as gaps — he uses them hands-on.',
    '- New Relic: only a soft gap if specifically required; he used Sentry, not New Relic.',
    '- Native iOS/Android: at most a soft gap ("experiência nativa limitada; forte em React Native"), never as if he has zero mobile.',
    '- If the job mentions security/scalability: treat as strength, not gap (unless a specific unused tool is required).',
  ].join('\n');
}
