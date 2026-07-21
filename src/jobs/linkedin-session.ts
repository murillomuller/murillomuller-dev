import * as fs from 'fs';
import * as path from 'path';
import { chromium, type BrowserContext, type Page } from 'playwright';
import { db } from '@/db';
import { linkedinSession } from '@/db/schema';
import { eq } from 'drizzle-orm';

export function getLinkedInStatePath(): string {
  const configured = process.env.LINKEDIN_STATE_PATH || '.linkedin_state.json';
  return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
}

export function hasLinkedInSessionFile(): boolean {
  return fs.existsSync(getLinkedInStatePath());
}

export async function getLinkedInSessionStatus() {
  const rows = await db.select().from(linkedinSession).limit(1);
  const row = rows[0];
  const fileExists = hasLinkedInSessionFile();
  return {
    connected: fileExists && !!row,
    fileExists,
    path: getLinkedInStatePath(),
    lastValidatedAt: row?.lastValidatedAt ?? null,
  };
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function isLoggedInUrl(url: string) {
  return (
    url.includes('/feed') ||
    url.includes('/mynetwork') ||
    url.includes('/jobs') ||
    url.includes('/in/') ||
    url.includes('/notifications')
  );
}

function isAuthWallUrl(url: string) {
  return (
    url.includes('/login') ||
    url.includes('/uas/login') ||
    url.includes('/checkpoint') ||
    url.includes('/challenge') ||
    url.includes('/authwall')
  );
}

function isNavigationContextError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Execution context was destroyed') ||
    message.includes('Cannot find context with specified id') ||
    message.includes('Target closed') ||
    message.includes('Frame was detached')
  );
}

async function waitForNavigationToSettle(page: Page, timeout = 5000) {
  await page.waitForLoadState('domcontentloaded', { timeout }).catch(() => undefined);
  await page.waitForLoadState('networkidle', { timeout }).catch(() => undefined);
}

async function hasVisibleLoginForm(page: Page): Promise<boolean> {
  try {
    await waitForNavigationToSettle(page, 3000);
    const loginFields = page.locator(
      'input[type="password"], input[type="email"], input[name="session_key"], #username, input[autocomplete="current-password"]'
    );
    const count = await loginFields.count();

    for (let index = 0; index < count; index++) {
      const field = loginFields.nth(index);
      if (await field.isVisible().catch(() => false)) return true;
    }

    return count > 0;
  } catch (error: unknown) {
    if (isNavigationContextError(error)) return false;
    throw error;
  }
}

export async function saveStorageStateFromCookies(liAt: string, jsessionid?: string) {
  const statePath = getLinkedInStatePath();
  const dir = path.dirname(statePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'Lax' | 'None' | 'Strict';
  }> = [
    {
      name: 'li_at',
      value: liAt.trim(),
      domain: '.linkedin.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'None',
    },
  ];

  if (jsessionid?.trim()) {
    cookies.push({
      name: 'JSESSIONID',
      value: jsessionid.trim().replace(/^"|"$/g, ''),
      domain: '.www.linkedin.com',
      path: '/',
      httpOnly: false,
      secure: true,
      sameSite: 'None',
    });
  }

  fs.writeFileSync(statePath, JSON.stringify({ cookies, origins: [] }, null, 2), 'utf8');
  await upsertSessionRecord(statePath);
  return statePath;
}

export async function saveStorageStateFromContext(context: BrowserContext) {
  const statePath = getLinkedInStatePath();
  const dir = path.dirname(statePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await context.storageState({ path: statePath });
  await upsertSessionRecord(statePath);
  return statePath;
}

async function upsertSessionRecord(statePath: string) {
  const existing = await db.select().from(linkedinSession).limit(1);
  const now = Date.now();
  if (existing[0]) {
    await db
      .update(linkedinSession)
      .set({ encryptedStatePath: statePath, lastValidatedAt: now })
      .where(eq(linkedinSession.id, existing[0].id));
  } else {
    await db.insert(linkedinSession).values({
      encryptedStatePath: statePath,
      lastValidatedAt: now,
    });
  }
}

async function waitForLoginSuccess(page: Page, timeoutMs = 180_000): Promise<'ok' | 'timeout' | 'failed'> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const url = page.url();

    if (isLoggedInUrl(url)) return 'ok';

    // unexpected_login_error = challenge was invalidated (e.g. by reload)
    if (url.includes('unexpected_login_error') || url.includes('errorKey=')) {
      return 'failed';
    }

    // Still waiting on phone / app approval — DO NOT reload (kills the challenge)
    if (url.includes('/checkpoint') || url.includes('/challenge')) {
      await sleep(2500);
      continue;
    }

    if (url.includes('/login') || url.includes('/uas/login') || url.includes('/flagship-web/login')) {
      if (await hasVisibleLoginForm(page)) return 'failed';
    }

    await sleep(2000);
  }
  return 'timeout';
}

export async function validateLinkedInSession(): Promise<{ ok: boolean; message: string }> {
  const statePath = getLinkedInStatePath();
  if (!fs.existsSync(statePath)) {
    return { ok: false, message: 'Sessão não encontrada. Conecte o LinkedIn primeiro.' };
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ storageState: statePath });
    const page = await context.newPage();
    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(2500);

    const url = page.url();
    if (isAuthWallUrl(url) || (await hasVisibleLoginForm(page))) {
      return { ok: false, message: 'Sessão inválida ou expirada. Conecte novamente.' };
    }

    await saveStorageStateFromContext(context);
    return { ok: true, message: 'Sessão LinkedIn válida e salva.' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Validação falhou: ${message}` };
  } finally {
    if (browser) await browser.close();
  }
}

export async function loginLinkedInWithCredentials(
  email: string,
  password: string
): Promise<{ ok: boolean; message: string; phase?: string }> {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      locale: 'pt-BR',
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();

    await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(2000);

    // LinkedIn redesigned login: duplicate forms; first inputs are 0x0 (hidden to Playwright).
    // Prefer the visible ones (usually index 1) / webauthn autocomplete / labels.
    const emailInput = page.locator('input[type="email"]').nth(1);
    const passwordInput = page.locator('input[type="password"]').nth(1);

    try {
      await emailInput.waitFor({ state: 'attached', timeout: 15000 });
      await passwordInput.waitFor({ state: 'attached', timeout: 15000 });
      await emailInput.fill(email, { force: true });
      await passwordInput.fill(password, { force: true });
    } catch {
      // Fallback: label-based (pt/en)
      await page.getByLabel(/e-mail|email|telefone|phone/i).last().fill(email, { force: true });
      await page.getByLabel(/^senha$|^password$/i).last().fill(password, { force: true });
    }

    const submit = page.getByRole('button', { name: /entrar|sign in|log in/i }).last();

    await Promise.all([
      submit.click({ force: true }),
      page.waitForLoadState('domcontentloaded').catch(() => undefined),
    ]);
    await waitForNavigationToSettle(page, 10000);
    await sleep(1000);

    let url = page.url();

    // Phone / app approval checkpoint — wait up to 2 minutes
    if (url.includes('/checkpoint') || url.includes('/challenge')) {
      const result = await waitForLoginSuccess(page, 120_000);
      if (result === 'timeout') {
        return {
          ok: false,
          phase: 'checkpoint',
          message:
            'Timeout: LinkedIn pediu confirmação no celular e não liberou em 2 min. Aprove no app e tente de novo, ou use o cookie li_at.',
        };
      }
      if (result === 'failed') {
        return {
          ok: false,
          phase: 'checkpoint',
          message: 'Checkpoint falhou / voltou ao login. Use o cookie li_at.',
        };
      }
    } else {
      // Still on login? Check for visible email/password fields again
      const stillLogin = url.includes('/login') && (await hasVisibleLoginForm(page));
      if (stillLogin && !(url.includes('/checkpoint') || url.includes('/challenge'))) {
        // Maybe slow redirect — wait a bit more for checkpoint/feed
        const result = await waitForLoginSuccess(page, 60_000);
        if (result !== 'ok') {
          return {
            ok: false,
            phase: 'credentials',
            message: 'Login falhou. Verifique email/senha, aprove no celular se pedido, ou use o cookie li_at.',
          };
        }
      }
    }

    // Confirm on feed
    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(2000);
    url = page.url();

    if (isAuthWallUrl(url)) {
      return {
        ok: false,
        phase: 'verify',
        message: 'Login não persistiu após o checkpoint. Use o cookie li_at.',
      };
    }

    await saveStorageStateFromContext(context);
    return {
      ok: true,
      phase: 'done',
      message: 'Login OK. Sessão salva automaticamente após aprovação.',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, phase: 'error', message: `Login error: ${message}` };
  } finally {
    if (browser) await browser.close();
  }
}

export async function disconnectLinkedInSession() {
  const statePath = getLinkedInStatePath();
  if (fs.existsSync(statePath)) fs.unlinkSync(statePath);
  const rows = await db.select().from(linkedinSession);
  for (const row of rows) {
    await db.delete(linkedinSession).where(eq(linkedinSession.id, row.id));
  }
}
