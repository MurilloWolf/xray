import path from 'node:path';

import { exists, upsertEnv, writeFileIfMissing } from './fs-utils';
import { appRouteTemplate, pagesRouteTemplate } from './templates';

export type InitResult = {
  routePath: string;
  routeWrite: 'created' | 'skipped';
  envPath: string;
  envUrlWrite: 'created' | 'updated' | 'skipped';
  envKeyWrite: 'created' | 'updated' | 'skipped';
  mode: 'app' | 'pages';
};

export function runInit(cwd: string): InitResult {
  const hasRootApp = exists(path.join(cwd, 'app'));
  const hasRootPages = exists(path.join(cwd, 'pages'));
  const hasSrcApp = exists(path.join(cwd, 'src', 'app'));
  const hasSrcPages = exists(path.join(cwd, 'src', 'pages'));

  if (!hasRootApp && !hasRootPages && !hasSrcApp && !hasSrcPages) {
    throw new Error(
      'Could not find app/ or pages/ directory (or src/app or src/pages). Is this a Next.js project?',
    );
  }

  const sourceRoot = hasRootApp || hasRootPages ? cwd : path.join(cwd, 'src');
  const mode: 'app' | 'pages' = hasRootApp || hasSrcApp ? 'app' : 'pages';
  const routePath =
    mode === 'app'
      ? path.join(sourceRoot, 'app', 'api', 'track', 'route.ts')
      : path.join(sourceRoot, 'pages', 'api', 'track.ts');

  const routeContent = mode === 'app' ? appRouteTemplate() : pagesRouteTemplate();
  const routeWrite = writeFileIfMissing(routePath, routeContent);

  const envPath = path.join(cwd, '.env.local');
  const envUrlWrite = upsertEnv(
    envPath,
    'ANALYTICS_INGEST_URL',
    'https://ingest.seudominio.com/track',
  );
  const envKeyWrite = upsertEnv(envPath, 'ANALYTICS_INGEST_KEY', 'DEV_SECRET_KEY');

  return {
    routePath,
    routeWrite,
    envPath,
    envUrlWrite,
    envKeyWrite,
    mode,
  };
}
