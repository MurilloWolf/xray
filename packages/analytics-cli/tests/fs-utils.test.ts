import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { upsertEnv, writeFileIfMissing } from '../src/fs-utils';

const tempDirs: string[] = [];

function createTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-cli-fs-'));
  tempDirs.push(dir);
  return dir;
}

describe('fs-utils', () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes file only when missing', () => {
    const dir = createTempDir();
    const filePath = path.join(dir, 'nested', 'file.txt');

    const first = writeFileIfMissing(filePath, 'hello');
    const second = writeFileIfMissing(filePath, 'world');

    expect(first).toBe('created');
    expect(second).toBe('skipped');
    expect(fs.readFileSync(filePath, 'utf8')).toBe('hello');
  });

  it('creates and upserts env entries', () => {
    const dir = createTempDir();
    const envPath = path.join(dir, '.env.local');

    const createResult = upsertEnv(envPath, 'A', '1');
    const updateResult = upsertEnv(envPath, 'B', '2');
    const skipResult = upsertEnv(envPath, 'A', '999');

    expect(createResult).toBe('created');
    expect(updateResult).toBe('updated');
    expect(skipResult).toBe('skipped');

    const content = fs.readFileSync(envPath, 'utf8');
    expect(content).toContain('A=1');
    expect(content).toContain('B=2');
    expect(content).not.toContain('A=999');
  });
});