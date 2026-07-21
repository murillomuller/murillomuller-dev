import assert from 'node:assert/strict';
import { describe, it, afterEach } from 'node:test';
import path from 'node:path';
import { getLinkedInStatePath } from '../src/jobs/linkedin-session';

const originalLinkedInStatePath = process.env.LINKEDIN_STATE_PATH;
const originalSqlitePath = process.env.SQLITE_PATH;

afterEach(() => {
  if (originalLinkedInStatePath === undefined) delete process.env.LINKEDIN_STATE_PATH;
  else process.env.LINKEDIN_STATE_PATH = originalLinkedInStatePath;
  if (originalSqlitePath === undefined) delete process.env.SQLITE_PATH;
  else process.env.SQLITE_PATH = originalSqlitePath;
});

describe('getLinkedInStatePath', () => {
  it('defaults to the writable data directory instead of /app/.linkedin_state.json', () => {
    delete process.env.LINKEDIN_STATE_PATH;
    delete process.env.SQLITE_PATH;

    assert.equal(getLinkedInStatePath(), path.join(process.cwd(), 'data', '.linkedin_state.json'));
  });

  it('uses the SQLite volume directory when SQLITE_PATH is configured', () => {
    delete process.env.LINKEDIN_STATE_PATH;
    process.env.SQLITE_PATH = '/app/data/cv.db';

    assert.equal(getLinkedInStatePath(), '/app/data/.linkedin_state.json');
  });

  it('allows explicit LINKEDIN_STATE_PATH override', () => {
    process.env.LINKEDIN_STATE_PATH = '/tmp/custom-linkedin-state.json';
    process.env.SQLITE_PATH = '/app/data/cv.db';

    assert.equal(getLinkedInStatePath(), '/tmp/custom-linkedin-state.json');
  });
});
