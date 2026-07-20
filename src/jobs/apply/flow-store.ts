import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { applyFlows, applyFlowRuns } from '../../db/schema';

export type FlowStep = {
  op: 'goto' | 'click' | 'fill' | 'upload' | 'select' | 'waitFor' | 'done';
  url?: string;
  selector?: string;
  role?: string;
  name?: string;
  fieldKey?: string;
  text?: string;
  successText?: string;
  from?: string;
};

export async function getFlowByDomain(domain: string) {
  const [flow] = await db.select().from(applyFlows).where(eq(applyFlows.domain, domain)).limit(1);
  if (!flow) return null;
  return {
    ...flow,
    steps: JSON.parse(flow.stepsJson) as FlowStep[],
  };
}

export async function saveFlow(
  domain: string,
  atsHint: string,
  steps: FlowStep[],
  success: boolean
) {
  const existing = await getFlowByDomain(domain);
  const stepsJson = JSON.stringify(steps);
  
  if (existing) {
    await db
      .update(applyFlows)
      .set({
        atsHint,
        stepsJson,
        version: existing.version + 1,
        successCount: success ? existing.successCount + 1 : existing.successCount,
        failCount: !success ? existing.failCount + 1 : existing.failCount,
        lastSuccessAt: success ? Date.now() : existing.lastSuccessAt,
        updatedAt: Date.now(),
      })
      .where(eq(applyFlows.id, existing.id));
    return existing.id;
  } else {
    const [inserted] = await db
      .insert(applyFlows)
      .values({
        domain,
        atsHint,
        stepsJson,
        successCount: success ? 1 : 0,
        failCount: !success ? 1 : 0,
        lastSuccessAt: success ? Date.now() : null,
      })
      .returning({ id: applyFlows.id });
    return inserted.id;
  }
}

export async function logFlowRun(run: {
  flowId?: number;
  applicationId: number;
  jobId: number;
  mode: 'replay' | 'explore';
  status: 'running' | 'success' | 'failed' | 'needs_review';
  error?: string;
  metaJson?: string;
}) {
  const [inserted] = await db.insert(applyFlowRuns).values(run).returning({ id: applyFlowRuns.id });
  return inserted.id;
}

export async function updateFlowRun(id: number, updates: {
  status: 'running' | 'success' | 'failed' | 'needs_review';
  error?: string;
  metaJson?: string;
}) {
  await db.update(applyFlowRuns).set({ ...updates, updatedAt: Date.now() }).where(eq(applyFlowRuns.id, id));
}
