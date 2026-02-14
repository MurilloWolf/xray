import type { AnalyticsEnvironment, AnalyticsProviderProps } from '../shared/types';

export function normalizeEnvironment(
  environment?: AnalyticsProviderProps['environment'],
): AnalyticsEnvironment {
  if (!environment) return 'production';
  const env = environment.toLowerCase();
  if (env === 'production' || env === 'prod') return 'production';
  if (env === 'development' || env === 'dev') return 'dev';
  return 'local';
}