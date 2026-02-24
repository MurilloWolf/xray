import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { runCommand } from '../src/cli';

const tempDirs: string[] = [];

function createTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xray-cli-cmd-'));
  tempDirs.push(dir);
  return dir;
}

describe('runCommand', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns 1 and usage message for unknown command', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const code = runCommand(['unknown'], process.cwd());

    expect(code).toBe(1);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('npx xray-analytics init'));
  });

  it('returns 0 for successful init command', () => {
    const dir = createTempDir();
    fs.mkdirSync(path.join(dir, 'app'));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const code = runCommand(['init'], dir);

    expect(code).toBe(0);
    expect(logSpy).toHaveBeenCalled();
  });
});
