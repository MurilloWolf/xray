import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendBeaconFirst } from '../src/runtime/transport';

describe('sendBeaconFirst', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses sendBeacon when available and successful', async () => {
    const sendBeaconMock = vi.fn().mockReturnValue(true);
    const fetchMock = vi.fn();

    Object.defineProperty(globalThis.navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeaconMock,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendBeaconFirst('/collect', '{"a":1}');

    expect(result).toEqual({ ok: true, status: 204 });
    expect(sendBeaconMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to fetch when sendBeacon fails', async () => {
    const sendBeaconMock = vi.fn().mockReturnValue(false);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201 });

    Object.defineProperty(globalThis.navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeaconMock,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendBeaconFirst('/collect', '{"b":2}');

    expect(result).toEqual({ ok: true, status: 201 });
    expect(fetchMock).toHaveBeenCalledWith('/collect', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"b":2}',
      keepalive: true,
    });
  });
});
