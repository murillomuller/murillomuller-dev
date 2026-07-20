import { db } from '../db';
import { jobSearchPrefs } from '../db/schema';
import { runDailyCycle } from './daily-runner';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function loop() {
  console.log('[Worker] Daemon started.');
  while (true) {
    try {
      const prefs = await db.select().from(jobSearchPrefs).limit(1).then(res => res[0]);
      if (!prefs) {
        console.log('[Worker] No job search preferences found.');
      } else if (process.env.JOBS_AUTO_APPLY === 'false' || !prefs.autoApplyEnabled) {
        console.log('[Worker] Auto-apply disabled or kill-switch active.');
      } else {
        await runDailyCycle();
      }
    } catch (e) {
      console.error('[Worker] Cycle error:', e);
    }

    console.log('[Worker] Sleeping for 4 hours...');
    await sleep(4 * 60 * 60 * 1000);
  }
}

if (require.main === module) {
  loop().catch(err => {
    console.error('[Worker] Fatal', err);
    process.exit(1);
  });
}
