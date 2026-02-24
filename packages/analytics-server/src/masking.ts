import type { MaskConfig, StoredAnalyticsEvent } from './types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function shouldMask(path: string, key: string, config: MaskConfig) {
  if (config.paths?.includes(path)) return true;
  if (config.keyPatterns?.some((pattern) => pattern.test(key))) return true;
  return false;
}

function maskRecursive(
  input: unknown,
  config: MaskConfig,
  event: StoredAnalyticsEvent,
  parentPath = '',
): unknown {
  if (Array.isArray(input)) {
    return input.map((item, index) =>
      maskRecursive(item, config, event, parentPath ? `${parentPath}.${index}` : String(index)),
    );
  }

  if (!isPlainObject(input)) return input;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const path = parentPath ? `${parentPath}.${key}` : key;

    if (shouldMask(path, key, config)) {
      out[key] = config.maskField
        ? config.maskField({ path, key, value, event })
        : (config.maskValue ?? '***');
      continue;
    }

    out[key] = maskRecursive(value, config, event, path);
  }

  return out;
}

export function applyMasking(
  event: StoredAnalyticsEvent,
  config?: MaskConfig,
): StoredAnalyticsEvent {
  if (!config) return event;

  return {
    ...event,
    props: (maskRecursive(event.props, config, event) as Record<string, unknown>) ?? {},
  };
}
