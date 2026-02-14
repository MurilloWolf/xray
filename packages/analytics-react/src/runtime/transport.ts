export async function sendBeaconFirst(url: string, payload: string) {
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const ok = navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
    if (ok) return { ok: true, status: 204 };
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: payload,
    keepalive: true,
  });
  return { ok: res.ok, status: res.status };
}