export function appRouteTemplate() {
  return `import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const raw = JSON.stringify(body);
    if (raw.length > 50000) {
      return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 413 });
    }

    const ingestUrl = process.env.ANALYTICS_INGEST_URL;
    const ingestKey = process.env.ANALYTICS_INGEST_KEY;

    if (!ingestUrl || !ingestKey) {
      return NextResponse.json({ ok: false, error: "missing_env" }, { status: 500 });
    }

    const res = await fetch(ingestUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ingest-key": ingestKey
      },
      body: raw
    });

    return NextResponse.json({ ok: res.ok }, { status: res.ok ? 200 : 502 });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
`;
}

export function pagesRouteTemplate() {
  return `import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  try {
    const raw = JSON.stringify(req.body);
    if (raw.length > 50000) return res.status(413).json({ ok: false, error: "payload_too_large" });

    const ingestUrl = process.env.ANALYTICS_INGEST_URL;
    const ingestKey = process.env.ANALYTICS_INGEST_KEY;
    if (!ingestUrl || !ingestKey) return res.status(500).json({ ok: false, error: "missing_env" });

    const r = await fetch(ingestUrl, {
      method: "POST",
      headers: { "content-type": "application/json", "x-ingest-key": ingestKey },
      body: raw
    });

    return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return res.status(400).json({ ok: false });
  }
}
`;
}
