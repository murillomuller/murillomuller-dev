import { type Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { getFlowByDomain, saveFlow, type FlowStep } from './flow-store';
import { decideNextAction } from '../ai/external-apply';
import type { ApplyPayload } from '../providers/types';
import { isUnlockCareerUrl, unlockCareerValueForKey } from '../providers/unlockcareer';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getAtsHint(domain: string) {
  if (domain.includes('greenhouse.io')) return 'greenhouse';
  if (domain.includes('lever.co')) return 'lever';
  if (domain.includes('myworkdayjobs.com')) return 'workday';
  if (domain.includes('gupy.io')) return 'gupy';
  if (domain.includes('ashbyhq.com')) return 'ashbyhq';
  if (domain.includes('unlockcareer.ai')) return 'unlockcareer';
  return 'unknown';
}

export async function runExternalApply(
  page: Page,
  startUrl: string,
  payload: ApplyPayload,
  log: (step: string, level: 'info' | 'warn' | 'error', message: string) => void
): Promise<{ success: boolean; status: 'applied_auto' | 'needs_review' | 'failed'; error?: string }> {
  log('external_start', 'info', `Starting external apply at ${startUrl}`);
  
  const urlObj = new URL(startUrl);
  const domain = urlObj.hostname;
  const atsHint = getAtsHint(domain);
  
  const flow = await getFlowByDomain(domain);
  
  if (flow && flow.steps.length > 0) {
    log('external_replay', 'info', `Found existing flow for ${domain} (${atsHint}), replaying...`);
    const result = await replayFlow(page, flow.steps, payload, log);
    if (result.success) {
      await saveFlow(domain, atsHint, flow.steps, true);
      return result;
    }
    log('external_replay_failed', 'warn', `Replay failed, falling back to explore: ${result.error}`);
  }
  
  log('external_explore', 'info', `Exploring ${domain} (${atsHint})...`);
  const exploreResult = await exploreFlow(page, startUrl, payload, log);
  
  if (exploreResult.steps.length > 0) {
    await saveFlow(domain, atsHint, exploreResult.steps, exploreResult.success);
  }
  
  return {
    success: exploreResult.success,
    status: exploreResult.success ? 'applied_auto' : (exploreResult.blocked ? 'needs_review' : 'failed'),
    error: exploreResult.error,
  };
}

async function replayFlow(
  page: Page,
  steps: FlowStep[],
  payload: ApplyPayload,
  log: (step: string, level: 'info' | 'warn' | 'error', message: string) => void
): Promise<{ success: boolean; status: 'applied_auto' | 'failed'; error?: string }> {
  try {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      log('replay_step', 'info', `Executing step ${i + 1}/${steps.length}: ${step.op}`);
      
      if (step.op === 'goto' && step.url) {
        await page.goto(step.url, { waitUntil: 'domcontentloaded' });
      } else if (step.op === 'click' && step.selector) {
        await page.locator(step.selector).first().click({ timeout: 10000 });
      } else if (step.op === 'fill' && step.selector) {
        let val = step.text || '';
        if (step.fieldKey) {
          val = getValueForKey(step.fieldKey, payload);
        }
        await page.locator(step.selector).first().fill(val, { timeout: 10000 });
      } else if (step.op === 'upload' && step.selector) {
        if (payload.cvPath && fs.existsSync(payload.cvPath)) {
          await page.locator(step.selector).first().setInputFiles(payload.cvPath, { timeout: 10000 });
        }
      } else if (step.op === 'select' && step.selector) {
        let val = step.text || '';
        if (step.fieldKey) {
          val = getValueForKey(step.fieldKey, payload);
        }
        if (val) {
          await page.locator(step.selector).first().selectOption({ label: val }, { timeout: 10000 }).catch(async () => {
             await page.locator(step.selector!).first().selectOption({ value: val }, { timeout: 10000 });
          });
        }
      } else if (step.op === 'waitFor' && step.text) {
        await page.waitForFunction((text) => document.body.innerText.includes(text), step.text, { timeout: 15000 });
      } else if (step.op === 'done') {
        return { success: true, status: 'applied_auto' };
      }
      await sleep(1000);
    }
    return { success: false, status: 'failed', error: 'Flow finished without done step' };
  } catch (err: any) {
    return { success: false, status: 'failed', error: err.message };
  }
}

async function exploreFlow(
  page: Page,
  startUrl: string,
  payload: ApplyPayload,
  log: (step: string, level: 'info' | 'warn' | 'error', message: string) => void
): Promise<{ success: boolean; blocked: boolean; error?: string; steps: FlowStep[] }> {
  const steps: FlowStep[] = [{ op: 'goto', url: startUrl }];
  const history: string[] = [];
  
  try {
    await page.goto(startUrl, { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    
    for (let i = 0; i < 15; i++) {
      await page.waitForLoadState('domcontentloaded');
      await sleep(1000);
      
      const snapshot = await extractSnapshot(page);
      
      if (/application submitted|thank you for applying|candidatura enviada/i.test(snapshot.text)) {
        steps.push({ op: 'done', successText: 'application submitted' });
        log('explore_done', 'info', 'Application submitted successfully');
        return { success: true, blocked: false, steps };
      }
      
      const decision = await decideNextAction({
        url: page.url(),
        title: snapshot.title,
        headings: snapshot.headings,
        controls: snapshot.controls,
        job: {
          title: payload.jobTitle,
          company: payload.company,
          description: payload.description,
        },
        history,
      });
      
      log('explore_decision', 'info', `AI decided: ${decision.action} on ${decision.selector} - ${decision.reason}`);
      history.push(`${decision.action} on ${decision.selector} (Reason: ${decision.reason})`);
      
      if (decision.blocked) {
        log('explore_blocked', 'warn', `AI reported blocked: ${decision.reason}`);
        return { success: false, blocked: true, error: decision.reason, steps };
      }
      
      if (decision.action === 'done') {
        steps.push({ op: 'done', successText: decision.reason });
        return { success: true, blocked: false, steps };
      } else if (decision.action === 'click' && decision.selector) {
        await page.locator(decision.selector).first().click({ timeout: 10000 });
        steps.push({ op: 'click', selector: decision.selector });
      } else if (decision.action === 'fill' && decision.selector) {
        let val = decision.value || '';
        if (decision.valueKey) {
          val = getValueForKey(decision.valueKey, payload);
        }
        await page.locator(decision.selector).first().fill(val, { timeout: 10000 });
        steps.push({ op: 'fill', selector: decision.selector, fieldKey: decision.valueKey, text: decision.value });
      } else if (decision.action === 'upload' && decision.selector) {
        if (payload.cvPath && fs.existsSync(payload.cvPath)) {
          await page.locator(decision.selector).first().setInputFiles(payload.cvPath, { timeout: 10000 });
          steps.push({ op: 'upload', selector: decision.selector, from: 'cvPath' });
        } else {
           log('explore_upload_failed', 'warn', 'No CV path provided or file does not exist');
        }
      } else if (decision.action === 'select' && decision.selector) {
        let val = decision.value || '';
        if (decision.valueKey) {
          val = getValueForKey(decision.valueKey, payload);
        }
        if (val) {
          await page.locator(decision.selector).first().selectOption({ label: val }, { timeout: 10000 }).catch(async () => {
             await page.locator(decision.selector).first().selectOption({ value: val }, { timeout: 10000 });
          });
          steps.push({ op: 'select', selector: decision.selector, fieldKey: decision.valueKey, text: decision.value });
        }
      }
      
      await sleep(2000);
    }
    
    return { success: false, blocked: true, error: 'Max steps reached', steps };
  } catch (err: any) {
    log('explore_error', 'error', err.message);
    return { success: false, blocked: false, error: err.message, steps };
  }
}

async function extractSnapshot(page: Page) {
  return await page.evaluate(() => {
    const title = document.title;
    const text = document.body.innerText;
    const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent?.trim() || '').filter(Boolean);
    
    const controls: { tag: string; type?: string; id?: string; name?: string; label?: string; text?: string; selector: string }[] = [];
    
    document.querySelectorAll('input, select, textarea, button, a.button, [role="button"]').forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const type = el.getAttribute('type') || undefined;
      const id = el.id || undefined;
      const name = el.getAttribute('name') || undefined;
      const textContent = el.textContent?.trim() || undefined;
      
      let label = undefined;
      if (id) {
        const labelEl = document.querySelector(`label[for="${id}"]`);
        if (labelEl) label = labelEl.textContent?.trim();
      }
      if (!label) {
        label = el.getAttribute('aria-label') || el.getAttribute('placeholder') || undefined;
      }
      
      let selector = tag;
      if (id) selector += `#${id}`;
      else if (name) selector += `[name="${name}"]`;
      else if (type) selector += `[type="${type}"]`;
      
      // Keep only visible and somewhat identifiable controls
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
         controls.push({ tag, type, id, name, label, text: textContent, selector });
      }
    });
    
    return { title, text, headings, controls };
  });
}

function getValueForKey(key: string, payload: ApplyPayload): string {
  const p = payload.profile || {};
  const fromUnlock =
    p.source === 'unlockcareer' ||
    Boolean(p.unlockCareer) ||
    isUnlockCareerUrl(String(p.applyUrl || p.jobUrl || ''));

  if (fromUnlock) {
    const unlockVal = unlockCareerValueForKey(key, { coverLetter: payload.coverLetter });
    if (unlockVal) return unlockVal;
  }

  switch (key) {
    case 'email': return p.email || 'murillosmf@hotmail.com';
    case 'phone': return p.phone || '';
    case 'name': return p.name || 'Murillo Müller';
    case 'firstName': return p.firstName || (p.name || 'Murillo Müller').split(' ')[0];
    case 'lastName': return p.lastName || (p.name || 'Murillo Müller').split(' ').slice(1).join(' ');
    case 'linkedin': return p.linkedinUrl || 'https://www.linkedin.com/in/murillomuller/';
    case 'github': return p.githubUrl || 'https://github.com/murillomuller';
    case 'location': return p.location || 'Londrina, Paraná, Brazil';
    case 'coverLetter': return payload.coverLetter || '';
    default: return '';
  }
}
