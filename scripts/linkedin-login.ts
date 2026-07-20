/**
 * CLI: login LinkedIn using .secrets/linkedin.json and save Playwright session.
 * Usage: npm run linkedin:login
 *
 * When LinkedIn shows app verification, APPROVE on your phone and wait.
 * Do not close the process — reloading the checkpoint kills the challenge.
 */
import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';
import {
  getLinkedInStatePath,
  saveStorageStateFromContext,
} from '../src/jobs/linkedin-session';

const secretsPath = path.join(process.cwd(), '.secrets', 'linkedin.json');
const logDir = path.join(process.cwd(), 'data', 'job-logs');

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!fs.existsSync(secretsPath)) {
    throw new Error(`Missing ${secretsPath}`);
  }
  const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8')) as {
    username?: string;
    password?: string;
    email?: string;
  };
  const email = secrets.username || secrets.email;
  const password = secrets.password;
  if (!email || !password) {
    throw new Error('linkedin.json must have username/email and password');
  }

  fs.mkdirSync(logDir, { recursive: true });
  console.log('[linkedin-login] starting for', email);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'pt-BR',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  const shot = async (name: string) => {
    const p = path.join(logDir, `linkedin-${name}.png`);
    await page.screenshot({ path: p, fullPage: true }).catch(() => undefined);
    console.log('[shot]', p, 'url=', page.url());
  };

  try {
    await page.goto('https://www.linkedin.com/login', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await sleep(2500);
    await shot('01-login-page');

    const emailInput = page.locator('input[type="email"]').nth(1);
    const passwordInput = page.locator('input[type="password"]').nth(1);
    await emailInput.waitFor({ state: 'attached', timeout: 20000 });
    await passwordInput.waitFor({ state: 'attached', timeout: 20000 });
    await emailInput.fill(email, { force: true });
    await passwordInput.fill(password, { force: true });
    await shot('02-filled');

    const submit = page.getByRole('button', { name: /entrar|sign in|log in/i }).last();
    await submit.click({ force: true });
    await sleep(4000);
    await shot('03-after-submit');
    console.log('[linkedin-login] after submit url=', page.url());

    // Check "recognize this device" if present
    try {
      const remember = page.getByText(/reconhecer este dispositivo|recognize this device/i);
      if (await remember.count()) {
        const box = page.locator('input[type="checkbox"]').last();
        if (await box.count()) await box.check({ force: true }).catch(() => undefined);
      }
    } catch {
      /* ignore */
    }

    if (page.url().includes('/checkpoint') || page.url().includes('/challenge')) {
      console.log('');
      console.log('============================================================');
      console.log('  CHECKPOINT: aprove no app LinkedIn do celular AGORA');
      console.log('  (toque em Sim / Yes). Nao feche — aguardando ate 3 min.');
      console.log('============================================================');
      console.log('');
    }

    // Wait without reload — reload invalidates the challenge
    const deadline = Date.now() + 180_000;
    while (Date.now() < deadline) {
      const url = page.url();
      console.log('[linkedin-login] polling...', url);

      if (url.includes('unexpected_login_error') || url.includes('errorKey=')) {
        throw new Error(
          'LinkedIn invalidated the challenge (unexpected_login_error). Run again and approve faster on the phone.'
        );
      }

      if (
        url.includes('/feed') ||
        url.includes('/mynetwork') ||
        url.includes('/jobs') ||
        (url.includes('linkedin.com/') &&
          !url.includes('/login') &&
          !url.includes('/checkpoint') &&
          !url.includes('/challenge') &&
          !url.includes('/uas/') &&
          !url.includes('/flagship-web/login'))
      ) {
        console.log('[linkedin-login] left auth wall');
        break;
      }

      if (url.includes('/checkpoint') || url.includes('/challenge')) {
        // Keep page alive; LinkedIn redirects automatically after phone approve
        await sleep(3000);
        continue;
      }

      await sleep(2500);
    }

    await shot('04-before-feed');
    await page.goto('https://www.linkedin.com/feed/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await sleep(3000);
    await shot('05-feed');

    const finalUrl = page.url();
    console.log('[linkedin-login] final url=', finalUrl);

    if (
      finalUrl.includes('/login') ||
      finalUrl.includes('/checkpoint') ||
      finalUrl.includes('/challenge') ||
      finalUrl.includes('/authwall') ||
      finalUrl.includes('errorKey')
    ) {
      throw new Error(`Login did not complete. Still at ${finalUrl}. See data/job-logs screenshots.`);
    }

    const statePath = getLinkedInStatePath();
    await saveStorageStateFromContext(context);
    console.log('[linkedin-login] SUCCESS session saved to', statePath);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('[linkedin-login] FAILED', err.message || err);
  process.exit(1);
});
