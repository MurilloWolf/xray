import { afterEach, describe, expect, it, vi } from 'vitest';

import { getOrCreateSessionId } from '../src/runtime/session';

describe('getOrCreateSessionId', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('creates and persists a session id when missing', () => {
    const randomUuidSpy = vi
      .spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValue('11111111-1111-1111-1111-111111111111');

    const sessionId = getOrCreateSessionId();

    expect(sessionId).toBe('11111111-1111-1111-1111-111111111111');
    expect(localStorage.getItem('xray_session_id')).toBe('11111111-1111-1111-1111-111111111111');
    expect(randomUuidSpy).toHaveBeenCalledTimes(1);
  });

  it('reuses stored session id without creating a new one', () => {
    localStorage.setItem('xray_session_id', 'stored-session');
    const randomUuidSpy = vi.spyOn(globalThis.crypto, 'randomUUID');

    const sessionId = getOrCreateSessionId();

    expect(sessionId).toBe('stored-session');
    expect(randomUuidSpy).not.toHaveBeenCalled();
  });
});
