import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runInit } from '../src/init';

const tempDirs: string[] = [];

function createTempDir(prefix: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

describe('runInit', () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('creates app router tracking route when app/ exists', () => {
    const dir = createTempDir('xray-cli-app-');
    fs.mkdirSync(path.join(dir, 'app'));

    const result = runInit(dir);

    expect(result.mode).toBe('app');
    expect(result.routeWrite).toBe('created');
    expect(fs.existsSync(path.join(dir, 'app', 'api', 'track', 'route.ts'))).toBe(true);
    expect(fs.readFileSync(path.join(dir, 'app', 'api', 'track', 'route.ts'), 'utf8')).toContain(
      'NextResponse',
    );
  });

  it('creates pages router tracking route when pages/ exists', () => {
    const dir = createTempDir('xray-cli-pages-');
    fs.mkdirSync(path.join(dir, 'pages'));

    const result = runInit(dir);

    expect(result.mode).toBe('pages');
    expect(result.routeWrite).toBe('created');
    expect(fs.existsSync(path.join(dir, 'pages', 'api', 'track.ts'))).toBe(true);
    expect(fs.readFileSync(path.join(dir, 'pages', 'api', 'track.ts'), 'utf8')).toContain(
      'NextApiRequest',
    );
  });

  it('upserts required env keys', () => {
    const dir = createTempDir('xray-cli-env-');
    fs.mkdirSync(path.join(dir, 'app'));

    runInit(dir);
    const envPath = path.join(dir, '.env.local');
    const content = fs.readFileSync(envPath, 'utf8');

    expect(content).toContain('ANALYTICS_INGEST_URL=https://ingest.seudominio.com/track');
    expect(content).toContain('ANALYTICS_INGEST_KEY=DEV_SECRET_KEY');
  });

  it('throws when neither app nor pages directory exists', () => {
    const dir = createTempDir('xray-cli-invalid-');

    expect(() => runInit(dir)).toThrow('Não encontrei pasta app/ ou pages/. Isso é um projeto Next.js?');
  });
});