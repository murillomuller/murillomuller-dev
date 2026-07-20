import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const profile = sqliteTable('profile', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  role: text('role').notNull(),
  avatarPath: text('avatar_path'),
  githubUrl: text('github_url'),
  linkedinUrl: text('linkedin_url'),
  locale: text('locale').notNull(), // 'pt-BR' or 'en'
});

export const about = sqliteTable('about', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  content: text('content').notNull(),
  locale: text('locale').notNull(),
});

export const experience = sqliteTable('experience', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  company: text('company').notNull(),
  role: text('role').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  description: text('description').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  locale: text('locale').notNull(),
});

export const skills = sqliteTable('skills', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  level: integer('level').notNull(), // 0-100
  sortOrder: integer('sort_order').notNull().default(0),
  // Skills usually don't strictly need i18n, but could be translatable if needed
});

export const education = sqliteTable('education', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  institution: text('institution').notNull(),
  degree: text('degree').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  locale: text('locale').notNull(),
});

export const languages = sqliteTable('languages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  level: text('level').notNull(),
  locale: text('locale').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const portfolio = sqliteTable('portfolio', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  imagePath: text('image_path'),
  link: text('link'),
  sortOrder: integer('sort_order').notNull().default(0),
  locale: text('locale').notNull(),
});

export const uiStrings = sqliteTable('ui_strings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull(),
  value: text('value').notNull(),
  locale: text('locale').notNull(),
});

export const jobSearchPrefs = sqliteTable('job_search_prefs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  keywords: text('keywords').notNull().default(''), // comma separated
  titles: text('titles').notNull().default(''), // comma separated
  locations: text('locations').notNull().default(''), // comma separated
  workplaces: text('workplaces').notNull().default('remote,hybrid,onsite'), // remote,hybrid,onsite
  seniority: text('seniority').notNull().default(''),
  salaryMin: integer('salary_min'),
  excludedCompanies: text('excluded_companies').notNull().default(''),
  languages: text('languages').notNull().default(''),
  enabledSources: text('enabled_sources').notNull().default('["linkedin"]'), // json array
  autoApplyEnabled: integer('auto_apply_enabled', { mode: 'boolean' }).notNull().default(false),
  minMatchScore: integer('min_match_score').notNull().default(70),
  maxAppliesPerDay: integer('max_applies_per_day').notNull().default(20),
});

export const jobs = sqliteTable('jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  source: text('source').notNull(), // e.g., 'linkedin'
  externalId: text('external_id').notNull().unique(),
  url: text('url').notNull(),
  title: text('title').notNull(),
  company: text('company').notNull(),
  location: text('location').notNull(),
  salaryText: text('salary_text'),
  salaryMin: integer('salary_min'),
  salaryMax: integer('salary_max'),
  benefitsJson: text('benefits_json'),
  descriptionFull: text('description_full').notNull(),
  descriptionSummary: text('description_summary'),
  postedAt: text('posted_at'),
  rawJson: text('raw_json'),
  createdAt: integer('created_at').notNull().default(Date.now()),
});

export const applications = sqliteTable('applications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobId: integer('job_id').notNull().references(() => jobs.id),
  status: text('status').notNull().default('discovered'), // discovered | matched | cv_adapted | applying | applied_auto | needs_review | awaiting_confirmation | applied_manual | skipped | failed
  matchScore: integer('match_score'),
  matchReasons: text('match_reasons'),
  adaptedCvPath: text('adapted_cv_path'),
  coverLetter: text('cover_letter'),
  attemptCount: integer('attempt_count').notNull().default(0),
  lastErrorId: integer('last_error_id'),
  pendingError: text('pending_error'),
  pendingFieldsJson: text('pending_fields_json'), // ScreeningField[] awaiting user answers
  updatedAt: integer('updated_at').notNull().default(Date.now()),
});

/** Learned screening answers — reused on future Easy Apply forms. */
export const screeningMemory = sqliteTable('screening_memory', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  questionKey: text('question_key').notNull().unique(), // normalized label
  labelSample: text('label_sample').notNull(),
  kind: text('kind').notNull().default('text'),
  answer: text('answer').notNull(),
  optionsJson: text('options_json'),
  source: text('source').notNull().default('user'), // user | ai | seed
  useCount: integer('use_count').notNull().default(0),
  createdAt: integer('created_at').notNull().default(Date.now()),
  updatedAt: integer('updated_at').notNull().default(Date.now()),
});

export const applyLogs = sqliteTable('apply_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  applicationId: integer('application_id').notNull().references(() => applications.id),
  step: text('step').notNull(),
  level: text('level').notNull(), // info | warn | error
  message: text('message').notNull(),
  screenshotPath: text('screenshot_path'),
  htmlSnapshotPath: text('html_snapshot_path'),
  stack: text('stack'),
  metaJson: text('meta_json'),
  createdAt: integer('created_at').notNull().default(Date.now()),
});

export const linkedinSession = sqliteTable('linkedin_session', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  encryptedStatePath: text('encrypted_state_path').notNull(),
  lastValidatedAt: integer('last_validated_at'),
});

export const applyFlows = sqliteTable('apply_flows', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  domain: text('domain').notNull().unique(), // e.g. 'boards.greenhouse.io'
  atsHint: text('ats_hint').notNull(), // 'greenhouse' | 'lever' | 'workday' | 'gupy' | 'unknown'
  version: integer('version').notNull().default(1),
  successCount: integer('success_count').notNull().default(0),
  failCount: integer('fail_count').notNull().default(0),
  lastSuccessAt: integer('last_success_at'),
  stepsJson: text('steps_json').notNull().default('[]'), // ordered list of steps
  notes: text('notes'),
  createdAt: integer('created_at').notNull().default(Date.now()),
  updatedAt: integer('updated_at').notNull().default(Date.now()),
});

export const applyFlowRuns = sqliteTable('apply_flow_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  flowId: integer('flow_id').references(() => applyFlows.id),
  applicationId: integer('application_id').notNull().references(() => applications.id),
  jobId: integer('job_id').notNull().references(() => jobs.id),
  mode: text('mode').notNull(), // 'replay' | 'explore'
  status: text('status').notNull(), // 'running' | 'success' | 'failed' | 'needs_review'
  error: text('error'),
  metaJson: text('meta_json'),
  createdAt: integer('created_at').notNull().default(Date.now()),
  updatedAt: integer('updated_at').notNull().default(Date.now()),
});

export const workerRuns = sqliteTable('worker_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  startedAt: integer('started_at').notNull(),
  endedAt: integer('ended_at'),
  searched: integer('searched').notNull().default(0),
  scored: integer('scored').notNull().default(0),
  applied: integer('applied').notNull().default(0),
  needsReview: integer('needs_review').notNull().default(0),
  failed: integer('failed').notNull().default(0),
  skipped: integer('skipped').notNull().default(0),
  message: text('message'),
  metaJson: text('meta_json'),
});


