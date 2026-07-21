import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';

describe('LinkedIn session navigation safety', () => {
  it('does not use page.$ in the login/session flow because it races with navigation contexts', () => {
    const source = fs.readFileSync('src/jobs/linkedin-session.ts', 'utf8');
    assert.equal(source.includes('page.$('), false);
  });
});
