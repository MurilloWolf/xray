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
  const hasApp = exists(path.join(cwd, 'app'));
  const hasPages = exists(path.join(cwd, 'pages'));

  if (!hasApp && !hasPages) {
    throw new Error('Não encontrei pasta app/ ou pages/. Isso é um projeto Next.js?');
  }

  const mode: 'app' | 'pages' = hasApp ? 'app' : 'pages';
  const routePath =
    mode === 'app'
      ? path.join(cwd, 'app', 'api', 'track', 'route.ts')
      : path.join(cwd, 'pages', 'api', 'track.ts');

  const routeContent = mode === 'app' ? appRouteTemplate() : pagesRouteTemplate();
  const routeWrite = writeFileIfMissing(routePath, routeContent);

  const envPath = path.join(cwd, '.env.local');
  const envUrlWrite = upsertEnv(envPath, 'ANALYTICS_INGEST_URL', 'https://ingest.seudominio.com/track');
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