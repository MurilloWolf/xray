import { describe, expect, it } from 'vitest';

import { normalizeEnvironment } from '../src/runtime/environment';

describe('normalizeEnvironment', () => {
  it('returns production by default', () => {
    expect(normalizeEnvironment()).toBe('production');
  });

  it('normalizes production aliases', () => {
    expect(normalizeEnvironment('production')).toBe('production');
    expect(normalizeEnvironment('prod')).toBe('production');
    expect(normalizeEnvironment('PrOd')).toBe('production');
  });

  it('normalizes development aliases', () => {
    expect(normalizeEnvironment('development')).toBe('dev');
    expect(normalizeEnvironment('dev')).toBe('dev');
    expect(normalizeEnvironment('DeVeLoPmEnT')).toBe('dev');
  });

  it('falls back to local for unknown values', () => {
    expect(normalizeEnvironment('local')).toBe('local');
    expect(normalizeEnvironment('test')).toBe('local');
    expect(normalizeEnvironment('staging')).toBe('local');
  });
});
