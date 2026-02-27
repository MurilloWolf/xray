export async function sendBeaconFirst(
  url: string,
  payload: string,
  options?: { preferBeacon?: boolean },
) {
  const preferBeacon = options?.preferBeacon ?? true;

  if (preferBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    try {
      const ok = navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
      if (ok) return { ok: true, status: 204 };
    } catch {
      // ignore and fallback to fetch
    }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload,
      keepalive: true,
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}
