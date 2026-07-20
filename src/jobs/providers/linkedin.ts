import { chromium, type Browser, type Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { getLinkedInStatePath } from '../linkedin-session';
import { isUnsetScreeningValue } from '../ai/screening';
import { cvPublicFilename } from '../../lib/cv/generate-pdf';
import type { ApplyPayload, ApplyResult, JobBoardProvider, RawJob } from './types';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export class LinkedInProvider implements JobBoardProvider {
  id = 'linkedin';
  private browser: Browser | null = null;
  private page: Page | null = null;
  private sessionStatePath = getLinkedInStatePath();

  private async initBrowser() {
    if (!this.browser) {
      if (!fs.existsSync(this.sessionStatePath)) {
        throw new Error('LinkedIn session missing. Connect at /dashboard/jobs/linkedin first.');
      }
      this.browser = await chromium.launch({ headless: true });
      const context = await this.browser.newContext({
        storageState: this.sessionStatePath,
        userAgent:
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        locale: 'pt-BR',
        viewport: { width: 1440, height: 900 },
      });
      this.page = await context.newPage();
    }
    return this.page!;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  async search(prefs: {
    keywords?: string;
    titles?: string;
    locations?: string;
    limit?: number;
    /** When true, LinkedIn filter f_AL=true (Easy Apply only). Default false. */
    easyApplyOnly?: boolean;
    postedWithin?: '24h' | 'week' | 'any';
  }): Promise<RawJob[]> {
    const page = await this.initBrowser();
    const keywordsRaw = (prefs.keywords || prefs.titles || 'fullstack developer').split(',')[0].trim() || 'developer';
    // Prefer a broad LinkedIn location when prefs list several cities.
    // First exact "Brazil"/"Brasil"/"Remote", else last broad token, else first.
    const locationParts = (prefs.locations || 'Brazil')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const preferredLocation =
      locationParts.find((l) => /^(brazil|brasil|remote|remoto)$/i.test(l)) ||
      locationParts.find((l) => /brazil|brasil|remote|remoto/i.test(l)) ||
      locationParts[0] ||
      'Brazil';
    const locationRaw = preferredLocation;
    const keywords = encodeURIComponent(keywordsRaw);
    const location = encodeURIComponent(locationRaw);
    const limit = prefs.limit ?? 15;
    const easyApplyOnly = prefs.easyApplyOnly === true;

    let timeFilter = '';
    if (prefs.postedWithin === '24h') timeFilter = '&f_TPR=r86400';
    else if (prefs.postedWithin === 'week') timeFilter = '&f_TPR=r604800';

    const searchUrl = easyApplyOnly
      ? `https://www.linkedin.com/jobs/search/?keywords=${keywords}&location=${location}&f_AL=true${timeFilter}&refresh=true`
      : `https://www.linkedin.com/jobs/search/?keywords=${keywords}&location=${location}${timeFilter}&refresh=true`;
    console.log('[LinkedInProvider.search] goto', searchUrl, { easyApplyOnly });

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(3500);
    console.log('[LinkedInProvider.search] landed', page.url());

    // Save debug screenshot
    try {
      const shotDir = path.join(process.cwd(), 'data', 'job-logs');
      fs.mkdirSync(shotDir, { recursive: true });
      await page.screenshot({
        path: path.join(shotDir, 'linkedin-search-debug.png'),
        fullPage: true,
      });
    } catch {
      /* ignore */
    }

    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 1400);
      await sleep(600);
    }

    // Extract in one evaluate — avoids per-card Playwright timeouts
    const extracted = await page.evaluate((max) => {
      const results: Array<{
        externalId: string;
        url: string;
        title: string;
        company: string;
        location: string;
      }> = [];
      const seen = new Set<string>();

      const anchors = Array.from(
        document.querySelectorAll<HTMLAnchorElement>('a[href*="/jobs/view/"]')
      );

      for (const a of anchors) {
        const href = a.href || '';
        const idMatch = href.match(/\/jobs\/view\/(\d+)/);
        if (!idMatch) continue;
        const externalId = idMatch[1];
        if (seen.has(externalId)) continue;

        const card =
          a.closest('li') ||
          a.closest('.job-card-container') ||
          a.closest('.base-card') ||
          a.parentElement;

        let title = (a.innerText || a.textContent || '').trim().split('\n')[0].trim();
        title = title.replace(/\s+with verification$/i, '').trim();
        if (!title || title.length < 2) continue;

        const companyEl = card?.querySelector(
          '.job-card-container__primary-description, .artdeco-entity-lockup__subtitle, h4, .base-search-card__subtitle'
        );
        const locEl = card?.querySelector(
          '.job-card-container__metadata-item, .job-search-card__location, .artdeco-entity-lockup__caption'
        );

        seen.add(externalId);
        results.push({
          externalId,
          url: `https://www.linkedin.com/jobs/view/${externalId}/`,
          title,
          company: (companyEl?.textContent || 'Unknown').trim().split('\n')[0].trim(),
          location: (locEl?.textContent || '').trim().split('\n')[0].trim(),
        });
        if (results.length >= max) break;
      }
      return results;
    }, limit);

    console.log('[LinkedInProvider.search] extracted', extracted.length);
    return extracted.map((j) => ({
      ...j,
      location: j.location || locationRaw,
    }));
  }

  async canAutoApply(_job?: unknown): Promise<boolean> {
    return true;
  }

  /** Open job page and import description, salary, benefits, etc. */
  async fetchDetails(jobUrl: string): Promise<{
    title?: string;
    company?: string;
    location?: string;
    salaryText?: string | null;
    descriptionFull: string;
    descriptionSummary?: string | null;
    benefits: string[];
    postedAt?: string | null;
    easyApply: boolean;
    raw?: Record<string, string | boolean | null>;
  }> {
    const page = await this.initBrowser();
    console.log('[LinkedInProvider.fetchDetails]', jobUrl);
    await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Wait for job body — LinkedIn now uses hashed class names, so key off visible text
    try {
      await page.waitForFunction(
        () => /About the job|Sobre a vaga|Easy Apply|Candidatura simplificada/i.test(document.body?.innerText || ''),
        { timeout: 15000 }
      );
    } catch {
      console.warn('[LinkedInProvider.fetchDetails] job body markers not found quickly');
    }
    await sleep(1500);

    // Expand truncated description ("… more" / Ver mais / See more)
    for (const label of ['Ver mais', 'See more', 'Show more', '… more', '... more', 'more']) {
      try {
        const btn = page.locator(`button:has-text("${label}")`).first();
        if ((await btn.count()) > 0 && (await btn.isVisible().catch(() => false))) {
          await btn.click({ timeout: 2000 }).catch(() => undefined);
          await sleep(600);
        }
      } catch {
        /* ignore */
      }
    }

    const details = await page.evaluate(() => {
      const bodyText = document.body?.innerText || '';
      const lines = bodyText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      // New LinkedIn UI often has no <h1>; title lives in document.title
      const titleFromDoc = document.title.match(/^(.+?)\s*\|\s*(.+?)\s*\|\s*LinkedIn/i);
      let title =
        (document.querySelector('h1')?.textContent || '').replace(/\s+/g, ' ').trim() ||
        titleFromDoc?.[1]?.trim() ||
        '';
      let company = titleFromDoc?.[2]?.trim() || '';

      if (!title || !company) {
        const skip =
          /^(home|my network|jobs|messaging|notifications|me|for business|retry premium|skip to|\d+\s+notifications)/i;
        const contentLines = lines.filter((l) => !skip.test(l) && l.length > 1);
        if (!company && contentLines[0]) company = contentLines[0];
        if (!title && contentLines[1]) title = contentLines[1];
      }

      const metaLine =
        lines.find((l) => /·/.test(l) && /(ago|atrás|applicants|candidat)/i.test(l)) || '';
      const location = metaLine.split('·')[0]?.trim() || '';
      const postedAt = metaLine || null;

      // Top card only — avoids salary from "similar jobs" sidebar ($110K etc.)
      const aboutIdx = bodyText.search(/About the job|Sobre a vaga/i);
      const topCardText = aboutIdx > 0 ? bodyText.slice(0, aboutIdx) : bodyText.slice(0, 2500);

      let description = '';
      const aboutHeading = Array.from(document.querySelectorAll('div, h2, h3, span, p')).find((el) => {
        const t = (el.textContent || '').trim();
        return /^(About the job|Sobre a vaga)$/i.test(t) && t.length < 40;
      });
      if (aboutHeading?.parentElement) {
        const block = (aboutHeading.parentElement as HTMLElement).innerText || '';
        description = block.replace(/^(About the job|Sobre a vaga)\s*/i, '').trim();
      }
      if (!description || description.length < 80) {
        const m = bodyText.match(
          /(?:About the job|Sobre a vaga)\s*\n+([\s\S]+?)(?=\n(?:About the company|Sobre a empresa|Show more jobs|People also viewed|Outras vagas|Vagas semelhantes|Similar jobs|Setores|Industries|Premium)\n|$)/i
        );
        if (m?.[1]) description = m[1].trim();
      }

      const criteria: string[] = [];
      for (const label of [
        'Remote',
        'Remoto',
        'Hybrid',
        'Híbrido',
        'On-site',
        'Presencial',
        'Full-time',
        'Part-time',
        'Contract',
        'CLT',
        'PJ',
      ]) {
        if (new RegExp(`(?:^|\\n)\\s*${label}\\s*(?:\\n|$)`, 'i').test(topCardText)) {
          criteria.push(label);
        }
      }

      // Require a real range or /period — never lone $110 from sidebar fragments
      const salaryRegex =
        /R\$\s?[\d.,]+\s*(?:-|–|a|to)\s*R\$\s?[\d.,]+(?:\s*\/\s*(?:mês|mes|month|ano|year))?|R\$\s?[\d.]{3,}(?:\s*\/\s*(?:mês|mes|month|ano|year))?|\$\s?[\d,.]+K?\s*(?:-|–)\s*\$\s?[\d,.]+K?\s*\/\s*(?:yr|year|mo|month)/gi;
      let salaryText: string | null = null;
      for (const m of topCardText.matchAll(salaryRegex)) {
        const raw = m[0].replace(/\s+/g, ' ').trim();
        const idx = m.index ?? 0;
        const ctx = topCardText.slice(Math.max(0, idx - 40), idx + raw.length + 20);
        if (/premium|retry|assinatura|upgrade|trial/i.test(ctx)) continue;
        if (/^R\$\s?0(?:[.,]0+)?$/i.test(raw.replace(/\s/g, ''))) continue;
        salaryText = raw;
        break;
      }

      const benefits: string[] = [];
      criteria.forEach((c) => {
        if (/benefício|vale|plano|health|dental|remoto|híbrido|hybrid|remote|CLT|PJ/i.test(c)) {
          benefits.push(c);
        }
      });
      const benefitBlock = (description || bodyText).match(
        /(?:Benefícios|Benefits|Perks)\s*\n+([\s\S]{20,800}?)(?=\n(?:About|Sobre|Requirements|Requisitos|Qualifications)\n|$)/i
      );
      if (benefitBlock?.[1]) {
        benefitBlock[1]
          .split(/\n+/)
          .map((l) => l.replace(/^[-•*]\s*/, '').trim())
          .filter((l) => l.length > 2 && l.length < 120)
          .slice(0, 12)
          .forEach((l) => {
            if (!benefits.includes(l)) benefits.push(l);
          });
      }

      const easyApply =
        Array.from(document.querySelectorAll('a, button')).some((el) => {
          const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
          return /^(Easy Apply|Candidatura simplificada)$/i.test(t);
        }) || /(?:^|\n)\s*(Easy Apply|Candidatura simplificada)\s*(?:\n|$)/i.test(topCardText);

      const summary =
        description
          .split(/\n+/)
          .map((l) => l.trim())
          .filter(Boolean)
          .slice(0, 4)
          .join(' ')
          .slice(0, 400) || null;

      return {
        title: title || undefined,
        company: company || undefined,
        location: location || undefined,
        salaryText,
        descriptionFull: description,
        descriptionSummary: summary,
        benefits,
        postedAt,
        easyApply,
        criteria,
      };
    });

    // Persist debug artifacts when scrape is thin
    if (!details.descriptionFull || details.descriptionFull.length < 80) {
      try {
        const shotDir = path.join(process.cwd(), 'data', 'job-logs');
        fs.mkdirSync(shotDir, { recursive: true });
        await page.screenshot({
          path: path.join(shotDir, `details-fail-${Date.now()}.png`),
          fullPage: false,
        });
        console.warn('[LinkedInProvider.fetchDetails] thin description', {
          url: page.url(),
          len: details.descriptionFull?.length || 0,
        });
      } catch {
        /* ignore */
      }
    }

    return {
      title: details.title,
      company: details.company,
      location: details.location,
      salaryText: details.salaryText,
      descriptionFull: details.descriptionFull || '',
      descriptionSummary: details.descriptionSummary,
      benefits: details.benefits || [],
      postedAt: details.postedAt,
      easyApply: details.easyApply,
      raw: {
        criteria: (details.criteria || []).join(' | '),
        easyApply: details.easyApply,
      },
    };
  }

  async apply(job: { url: string }, payload: ApplyPayload): Promise<ApplyResult> {
    const logs: NonNullable<ApplyResult['logs']> = [];
    const log = (step: string, level: 'info' | 'warn' | 'error', message: string) => {
      logs.push({ step, level, message });
    };
    const shotDir = path.join(process.cwd(), 'data', 'job-logs');
    fs.mkdirSync(shotDir, { recursive: true });

    const screenshot = async (name: string) => {
      try {
        if (!this.page) return;
        const p = path.join(shotDir, `${name}-${Date.now()}.png`);
        await this.page.screenshot({ path: p, fullPage: false });
        return p;
      } catch {
        return undefined;
      }
    };

    try {
      const page = await this.initBrowser();

      // Warm session — LinkedIn sometimes fails direct job loads otherwise
      log('warm_session', 'info', 'Opening feed to validate session');
      await page.goto('https://www.linkedin.com/feed/', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await sleep(1200);

      log('open_job', 'info', `Navigating to ${job.url}`);
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(3000);

      // New LinkedIn UI: Easy Apply is an <a aria-label="Easy Apply…"> with /apply/?openSDUIApplyFlow=true
      const applyLink = page
        .locator(
          'a[aria-label*="Easy Apply"], a[aria-label*="Candidatura simplificada"], a[aria-label*="Candidatura"]'
        )
        .first();

      let applyHref: string | null = null;
      let isEasyApply = false;

      try {
        await applyLink.waitFor({ state: 'visible', timeout: 15000 });
        applyHref = await applyLink.getAttribute('href');
        const easyText = await applyLink.evaluate(
          (el) =>
            !!el.textContent?.includes('Easy Apply') ||
            !!el.textContent?.includes('simplificada')
        );
        if (applyHref && (applyHref.includes('openSDUIApplyFlow') || easyText)) {
          isEasyApply = true;
        } else {
          // If it just says "Candidatura" or "Apply" without Easy, it might be external
          isEasyApply = false;
        }
      } catch {
        /* fall through */
      }

      if (!applyHref) {
        // Legacy button fallback
        const legacy = page
          .locator(
            'button.jobs-apply-button, button:has-text("Candidatura simplificada"), button:has-text("Easy Apply"), button:has-text("Apply"), button:has-text("Candidatar-se")'
          )
          .first();
        if ((await legacy.count()) === 0) {
          const shot = await screenshot('no-easy-apply');
          logs.push({
            step: 'detect_easy_apply',
            level: 'warn',
            message: 'Apply button not found.',
            screenshotPath: shot,
          });
          return { success: false, status: 'needs_review', error: 'No Apply button', logs };
        }
        
        const text = await legacy.textContent() || '';
        isEasyApply = /Easy Apply|simplificada/i.test(text);
        
        if (!isEasyApply) {
           // It's an external apply button, let's click it and catch the new page if it opens one
           let newPage = page;
           const [popup] = await Promise.all([
             page.context().waitForEvent('page').catch(() => null),
             legacy.click()
           ]);
           if (popup) {
             newPage = popup;
             await newPage.waitForLoadState('domcontentloaded');
           } else {
             await page.waitForLoadState('domcontentloaded');
           }
           
           const externalUrl = newPage.url();
           const { runExternalApply } = await import('../apply/external-agent');
           const result = await runExternalApply(newPage, externalUrl, payload, log);
           if (popup) await newPage.close();
           return { ...result, isExternal: true, logs };
        } else {
           await legacy.click();
        }
      } else {
        const abs = applyHref.startsWith('http')
          ? applyHref
          : `https://www.linkedin.com${applyHref}`;
        log('detect_easy_apply', 'info', `Opening apply flow: ${abs}`);
        
        if (!isEasyApply) {
           // It's an external link
           const newPage = await page.context().newPage();
           await newPage.goto(abs, { waitUntil: 'domcontentloaded' });
           const externalUrl = newPage.url();
           const { runExternalApply } = await import('../apply/external-agent');
           const result = await runExternalApply(newPage, externalUrl, payload, log);
           await newPage.close();
           return { ...result, isExternal: true, logs };
        } else {
           await page.goto(abs, { waitUntil: 'domcontentloaded', timeout: 60000 });
        }
      }

      await sleep(3500);
      await screenshot('apply-opened');

      const dialogVisible = await page.evaluate(() =>
        /Dialog content start\.|Apply to |Candidatar-se/i.test(document.body?.innerText || '')
      );
      if (!dialogVisible) {
        // Try clicking the link as last resort
        try {
          await applyLink.click({ timeout: 5000 });
          await sleep(3500);
        } catch {
          /* ignore */
        }
      }

      const maxSteps = 8;
      for (let step = 0; step < maxSteps; step++) {
        const body = await page.evaluate(() => document.body?.innerText || '');
        const dialog =
          body.match(/Dialog content start\.[\s\S]*?Dialog content end\./)?.[0] || body.slice(0, 2000);
        log('step', 'info', `Apply step ${step}: ${dialog.slice(0, 180).replace(/\n/g, ' | ')}`);

        if (/Application submitted|Candidatura enviada|Your application was sent/i.test(body)) {
          log('submitted', 'info', 'Application submitted successfully');
          await screenshot('submitted');
          return { success: true, status: 'applied_auto', logs };
        }

        // Upload resume when file input is present
        const fileInput = page.locator('input[type="file"]').first();
        if ((await fileInput.count()) > 0 && payload.cvPath && fs.existsSync(payload.cvPath)) {
          try {
            const uploadName = cvPublicFilename(payload.locale || 'en');
            await fileInput.setInputFiles({
              name: uploadName,
              mimeType: 'application/pdf',
              buffer: fs.readFileSync(payload.cvPath),
            });
            log('upload_cv', 'info', `Uploaded CV as ${uploadName}`);
            await sleep(2000);
          } catch (err: unknown) {
            log(
              'upload_cv',
              'warn',
              err instanceof Error ? err.message : String(err)
            );
          }
        }

        // Fill screening questions with AI (CV-aware)
        await this.fillEasyApplyQuestions(page, payload, log);

        // Prefer final submit
        const submitted = await page.evaluate(() => {
          const b = Array.from(document.querySelectorAll('button')).find((btn) =>
            /Submit application|Enviar candidatura/i.test(
              `${btn.textContent || ''} ${btn.getAttribute('aria-label') || ''}`
            )
          );
          if (!b || (b as HTMLButtonElement).disabled) return false;
          b.click();
          return true;
        });
        if (submitted) {
          log('submit', 'info', 'Clicked Submit application');
          await sleep(5000);
          await screenshot('after-submit');
          const after = await page.evaluate(() => document.body?.innerText || '');
          if (/Application submitted|Candidatura enviada|Your application was sent/i.test(after)) {
            return { success: true, status: 'applied_auto', logs };
          }
          // Sometimes success toast without those exact words — treat as success if dialog closed
          if (!/Dialog content start/i.test(after) || /Application status/i.test(after)) {
            return { success: true, status: 'applied_auto', logs };
          }
          continue;
        }

        // Review step
        const reviewed = await page.evaluate(() => {
          const b = Array.from(document.querySelectorAll('button')).find((btn) => {
            const label = `${(btn.textContent || '').replace(/\s+/g, ' ').trim()} ${btn.getAttribute('aria-label') || ''}`;
            return /^(Review|Revisar)$/i.test((btn.textContent || '').replace(/\s+/g, ' ').trim()) ||
              /Review your application|Revisar/i.test(btn.getAttribute('aria-label') || '');
          });
          if (!b || (b as HTMLButtonElement).disabled) return false;
          b.click();
          return true;
        });
        if (reviewed) {
          log('review', 'info', 'Clicked Review');
          await sleep(3000);
          continue;
        }

        // Next / Continue
        const next = page.locator('button[aria-label="Continue to next step"]');
        if ((await next.count()) > 0 && (await next.first().isEnabled().catch(() => false))) {
          await next.first().click();
          log('next', 'info', 'Clicked Continue to next step');
          await sleep(2500);
          continue;
        }

        const nextByText = await page.evaluate(() => {
          const b = Array.from(document.querySelectorAll('button')).find((btn) =>
            /^(Next|Avançar|Seguinte|Continue)$/i.test((btn.textContent || '').replace(/\s+/g, ' ').trim())
          );
          if (!b || (b as HTMLButtonElement).disabled) return false;
          b.click();
          return true;
        });
        if (nextByText) {
          log('next', 'info', 'Clicked Next');
          await sleep(2500);
          continue;
        }

        await screenshot(`stuck-step-${step}`);
        log('stuck', 'warn', 'No actionable button found on this step');
        break;
      }

      const finalBody = await page.evaluate(() => document.body?.innerText || '');
      if (/Application submitted|Candidatura enviada/i.test(finalBody)) {
        return { success: true, status: 'applied_auto', logs };
      }

      const pendingFields = await this.extractEasyApplyFields(page);
      const emptyPending = pendingFields.filter((f) => this.isFieldEmpty(f));
      log(
        'needs_review',
        'warn',
        `Incomplete apply — ${emptyPending.length} field(s) need answers`
      );

      return {
        success: false,
        status: 'needs_review',
        error: 'Easy Apply flow incomplete — needs manual review',
        pendingFields: emptyPending.length > 0 ? emptyPending : pendingFields,
        logs,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      log('apply_execution', 'error', message);
      await screenshot('apply-error');
      return { success: false, status: 'failed', error: message, logs };
    }
  }

  private isFieldEmpty(f: {
    kind: string;
    currentValue?: string;
    options?: string[];
  }): boolean {
    return isUnsetScreeningValue(f.currentValue);
  }

  private async extractEasyApplyFields(page: Page) {
    return page.evaluate(() => {
      const out: Array<{
        id: string;
        kind: 'text' | 'number' | 'textarea' | 'select' | 'radio' | 'checkbox';
        label: string;
        required?: boolean;
        options?: string[];
        currentValue?: string;
      }> = [];

      const inApplyForm = (el: Element) => {
        const id = (el as HTMLElement).id || '';
        return /easyApply|formElement|jobs-apply/i.test(id);
      };

      const labelFor = (el: HTMLElement) => {
        const byLabel = (el as HTMLInputElement).labels?.[0]?.innerText;
        if (byLabel) return byLabel.replace(/\s+/g, ' ').trim().slice(0, 240);
        const closest = el.closest('div, fieldset, li')?.textContent || '';
        return closest.replace(/\s+/g, ' ').trim().slice(0, 240);
      };

      for (const input of Array.from(document.querySelectorAll('input'))) {
        if (!inApplyForm(input) && !/numeric|phoneNumber|text-entity/i.test(input.id)) continue;
        if (input.type === 'hidden' || input.type === 'file' || input.type === 'checkbox') continue;
        if (input.type === 'radio') {
          const name = input.name || input.id;
          if (out.some((f) => f.id === `radio:${name}`)) continue;
          const group = Array.from(
            document.querySelectorAll(`input[type="radio"][name="${name.replace(/"/g, '\\"')}"]`)
          ) as HTMLInputElement[];
          const options = group
            .map((r) => {
              const lab = r.labels?.[0]?.innerText || r.value || '';
              return lab.replace(/\s+/g, ' ').trim();
            })
            .filter(Boolean);
          const selected = group.find((r) => r.checked);
          out.push({
            id: `radio:${name}`,
            kind: 'radio',
            label: labelFor(input),
            required: input.required,
            options,
            currentValue: selected
              ? (selected.labels?.[0]?.innerText || selected.value || '').replace(/\s+/g, ' ').trim()
              : '',
          });
          continue;
        }
        if (!(input.type === 'text' || input.type === 'number' || input.type === 'tel')) continue;
        if (/^Search$/i.test(input.getAttribute('aria-label') || '')) continue;
        out.push({
          id: input.id,
          kind: input.type === 'number' ? 'number' : 'text',
          label: labelFor(input),
          required: input.required,
          currentValue: input.value || '',
        });
      }

      for (const ta of Array.from(document.querySelectorAll('textarea'))) {
        if (!inApplyForm(ta) && !/easyApply|formElement/i.test(ta.id)) continue;
        if (/recaptcha/i.test(ta.name || ta.id)) continue;
        out.push({
          id: ta.id,
          kind: 'textarea',
          label: labelFor(ta),
          required: ta.required,
          currentValue: ta.value || '',
        });
      }

      for (const sel of Array.from(document.querySelectorAll('select'))) {
        if (!inApplyForm(sel) && !/easyApply|formElement|phoneNumber-country|email/i.test(sel.id)) {
          continue;
        }
        if (/globalfooter|language/i.test(sel.id)) continue;
        const options = Array.from(sel.options)
          .map((o) => o.textContent?.replace(/\s+/g, ' ').trim() || '')
          .filter((t) => t && !/^(selecionar|select an option|select option|choose|select\.\.\.|selecione)$/i.test(t));
        const selectedRaw =
          sel.selectedOptions?.[0]?.textContent?.replace(/\s+/g, ' ').trim() ||
          sel.options[sel.selectedIndex]?.textContent?.replace(/\s+/g, ' ').trim() ||
          '';
        out.push({
          id: sel.id,
          kind: 'select',
          label: labelFor(sel),
          required: sel.required || sel.getAttribute('aria-required') === 'true',
          options,
          currentValue: selectedRaw,
        });
      }

      // LinkedIn often uses combobox / listbox instead of <select>
      for (const box of Array.from(
        document.querySelectorAll('[role="combobox"], button[aria-haspopup="listbox"]')
      )) {
        const el = box as HTMLElement;
        if (!inApplyForm(el) && !el.closest('[data-test-modal-id], .jobs-easy-apply-modal, form')) {
          continue;
        }
        const label =
          el.getAttribute('aria-label') ||
          labelFor(el) ||
          el.closest('div, fieldset, li')?.querySelector('label')?.textContent ||
          '';
        const cleanLabel = label.replace(/\s+/g, ' ').trim().slice(0, 240);
        if (!cleanLabel || /search/i.test(cleanLabel)) continue;
        const id = el.id || `combo:${cleanLabel.slice(0, 40)}`;
        if (out.some((f) => f.id === id || f.label === cleanLabel)) continue;
        const current =
          el.getAttribute('aria-valuetext') ||
          el.textContent?.replace(/\s+/g, ' ').trim() ||
          '';
        out.push({
          id,
          kind: 'select',
          label: cleanLabel,
          required: el.getAttribute('aria-required') === 'true',
          options: [],
          currentValue: current.slice(0, 120),
        });
      }

      return out.filter((f) => f.id && f.label);
    });
  }

  private async fillEasyApplyQuestions(
    page: Page,
    payload: ApplyPayload,
    log: (step: string, level: 'info' | 'warn' | 'error', message: string) => void
  ) {
    const { answerScreeningQuestions } = await import('../ai/screening');
    const { recallScreeningAnswer, learnScreeningAnswer } = await import('../ai/screening-memory');

    const fields = await this.extractEasyApplyFields(page);
    const empty = fields.filter((f) => {
      if (!this.isFieldEmpty(f)) return false;
      if (/e-?mail|código do país|country code|phone country/i.test(f.label) && f.kind === 'select') {
        return false;
      }
      return true;
    });

    if (empty.length === 0) {
      log('ai_screening', 'info', `No empty screening fields (${fields.length} total seen)`);
      return;
    }

    log(
      'ai_screening',
      'info',
      `Found ${empty.length} empty / ${fields.length} total: ${empty
        .map((f) => f.label.slice(0, 40))
        .join(' · ')}`
    );

    const forced = payload.forcedAnswers || [];
    const answers: Array<{ id: string; value: string; reason?: string }> = [];

    for (const f of empty) {
      const byId = forced.find((a) => a.id && a.id === f.id);
      const byLabel = forced.find(
        (a) => a.label && a.label.toLowerCase() === f.label.toLowerCase()
      );
      if (byId?.value || byLabel?.value) {
        answers.push({
          id: f.id,
          value: String(byId?.value || byLabel?.value),
          reason: 'panel-user',
        });
        continue;
      }
      const remembered = await recallScreeningAnswer(f.label);
      if (remembered) {
        // Prefer option that matches memory when select/radio
        let value = remembered;
        if (f.options?.length) {
          const match =
            f.options.find((o) => o === remembered) ||
            f.options.find((o) => o.toLowerCase() === remembered.toLowerCase()) ||
            f.options.find((o) => o.toLowerCase().includes(remembered.toLowerCase())) ||
            f.options.find((o) => remembered.toLowerCase().includes(o.toLowerCase()));
          if (match) value = match;
        }
        answers.push({ id: f.id, value, reason: 'memory' });
      }
    }

    const stillEmpty = empty.filter((f) => !answers.some((a) => a.id === f.id));
    if (stillEmpty.length > 0) {
      log('ai_screening', 'info', `Asking AI for ${stillEmpty.length} field(s)`);
      const aiAnswers = await answerScreeningQuestions({
        fields: stillEmpty,
        job: {
          title: payload.jobTitle,
          company: payload.company,
          location: payload.location,
          description: payload.description,
        },
        locale: payload.locale || 'pt-BR',
      });
      for (const a of aiAnswers) {
        answers.push(a);
        const field = stillEmpty.find((f) => f.id === a.id);
        if (field && a.value) {
          await learnScreeningAnswer({
            label: field.label,
            answer: a.value,
            kind: field.kind,
            options: field.options,
            source: 'ai',
          });
        }
      }
    } else {
      log('ai_screening', 'info', `Filled ${answers.length} field(s) from panel/memory`);
    }

    for (const a of answers) {
      try {
        if (a.id.startsWith('radio:')) {
          const name = a.id.slice('radio:'.length);
          const clicked = await page.evaluate(
            ({ name, value }) => {
              const radios = Array.from(
                document.querySelectorAll(`input[type="radio"][name="${name}"]`)
              ) as HTMLInputElement[];
              const match = radios.find((r) => {
                const lab = (r.labels?.[0]?.innerText || r.value || '').replace(/\s+/g, ' ').trim();
                return lab === value || lab.toLowerCase() === value.toLowerCase();
              });
              if (!match) return false;
              match.click();
              return true;
            },
            { name, value: String(a.value) }
          );
          log(
            'fill_question',
            clicked ? 'info' : 'warn',
            `radio ${name} => ${a.value} (${a.reason || 'ai'})`
          );
          continue;
        }

        if (a.id.startsWith('combo:')) {
          const field = empty.find((f) => f.id === a.id) || fields.find((f) => f.id === a.id);
          const opened = await page.evaluate(
            ({ label, value }) => {
              const boxes = Array.from(
                document.querySelectorAll('[role="combobox"], button[aria-haspopup="listbox"]')
              ) as HTMLElement[];
              const box = boxes.find((el) => {
                const lab =
                  el.getAttribute('aria-label') ||
                  el.closest('div, fieldset, li')?.querySelector('label')?.textContent ||
                  el.textContent ||
                  '';
                return lab.replace(/\s+/g, ' ').trim().includes(label.slice(0, 40));
              });
              if (!box) return 'no-box';
              box.click();
              return 'opened';
            },
            { label: field?.label || '', value: String(a.value) }
          );
          await sleep(400);
          if (opened === 'opened') {
            const picked = await page.evaluate((value) => {
              const opts = Array.from(
                document.querySelectorAll('[role="option"], [role="listbox"] li, .artdeco-list__item')
              ) as HTMLElement[];
              const match = opts.find((o) => {
                const t = (o.textContent || '').replace(/\s+/g, ' ').trim();
                return t === value || t.toLowerCase() === value.toLowerCase() || t.includes(value);
              });
              if (!match) return false;
              match.click();
              return true;
            }, String(a.value));
            log(
              'fill_question',
              picked ? 'info' : 'warn',
              `combo ${a.id.slice(-24)} => ${a.value} (${a.reason || 'ai'})`
            );
          }
          continue;
        }

        const escaped = a.id.replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
        const loc = page.locator(`#${escaped}`);
        if ((await loc.count()) === 0) continue;

        const tag = await loc.evaluate((el) => el.tagName.toLowerCase());
        if (tag === 'select') {
          try {
            await loc.selectOption({ label: String(a.value) });
          } catch {
            await loc.selectOption({ value: String(a.value) }).catch(() => undefined);
          }
        } else {
          await loc.click({ force: true });
          await loc.fill(String(a.value));
        }
        log('fill_question', 'info', `${a.id.slice(-28)} => ${a.value} (${a.reason || 'ai'})`);
        await sleep(120);
      } catch (err: unknown) {
        log('fill_question', 'warn', err instanceof Error ? err.message : String(err));
      }
    }
  }
}
