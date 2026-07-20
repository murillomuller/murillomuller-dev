export interface RawJob {
  externalId: string;
  url: string;
  title: string;
  company: string;
  location: string;
  salaryText?: string;
  descriptionSummary?: string;
  postedAt?: string;
  rawJson?: string;
}

export interface ApplyPayload {
  cvPath: string;
  coverLetter?: string;
  profile: any; // Can be strongly typed later
  jobTitle?: string;
  company?: string;
  location?: string;
  description?: string;
  locale?: string;
  /** User answers from review panel — keyed by field id or label */
  forcedAnswers?: Array<{ id?: string; label?: string; value: string }>;
}

export interface ApplyResult {
  success: boolean;
  status: 'applied_auto' | 'needs_review' | 'failed';
  error?: string;
  isExternal?: boolean;
  pendingFields?: Array<{
    id: string;
    kind: 'text' | 'number' | 'textarea' | 'select' | 'radio' | 'checkbox';
    label: string;
    required?: boolean;
    options?: string[];
    currentValue?: string;
  }>;
  logs?: Array<{
    step: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    screenshotPath?: string;
    htmlSnapshotPath?: string;
  }>;
}

export interface JobBoardProvider {
  id: string;
  search(prefs: any): Promise<RawJob[]>;
  canAutoApply(job: any): Promise<boolean>;
  apply(job: any, payload: ApplyPayload): Promise<ApplyResult>;
}
