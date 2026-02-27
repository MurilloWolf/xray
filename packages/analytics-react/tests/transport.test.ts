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

  it('uses fetch directly when preferBeacon is disabled', async () => {
    const sendBeaconMock = vi.fn().mockReturnValue(true);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 });

    Object.defineProperty(globalThis.navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeaconMock,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendBeaconFirst('/collect', '{"c":3}', { preferBeacon: false });

    expect(result).toEqual({ ok: true, status: 202 });
    expect(sendBeaconMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to fetch when sendBeacon throws', async () => {
    const sendBeaconMock = vi.fn().mockImplementation(() => {
      throw new Error('beacon crashed');
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    Object.defineProperty(globalThis.navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeaconMock,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendBeaconFirst('/collect', '{"d":4}');

    expect(result).toEqual({ ok: true, status: 200 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns safe failure when fetch throws', async () => {
    const sendBeaconMock = vi.fn().mockReturnValue(false);
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));

    Object.defineProperty(globalThis.navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeaconMock,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendBeaconFirst('/collect', '{"e":5}');

    expect(result).toEqual({ ok: false, status: 0 });
  });
});
