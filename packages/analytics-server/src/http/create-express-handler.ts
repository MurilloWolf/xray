import { createAnalyticsServer } from '../create-analytics-server';
import type { IngestContext } from '../types';

type Server = ReturnType<typeof createAnalyticsServer>;

type HeaderValue = string | string[] | undefined;

export type ExpressLikeRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, HeaderValue>;
  ip?: string;
  get?: (name: string) => string | undefined;
  header?: (name: string) => string | undefined;
};

export type ExpressLikeResponse = {
  status: (code: number) => ExpressLikeResponse;
  json: (body: unknown) => unknown;
};

export type ExpressIngestHandlerOptions = {
  getContext?: (req: ExpressLikeRequest) => IngestContext;
};

function getHeader(req: ExpressLikeRequest, name: string): string | undefined {
  const lower = name.toLowerCase();

  if (typeof req.get === 'function') return req.get(lower) ?? req.get(name) ?? undefined;
  if (typeof req.header === 'function') return req.header(lower) ?? req.header(name) ?? undefined;

  const raw = req.headers?.[lower] ?? req.headers?.[name];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

function extractContextFromExpress(req: ExpressLikeRequest): IngestContext {
  return {
    ip: req.ip ?? getHeader(req, 'x-forwarded-for'),
    userAgent: getHeader(req, 'user-agent'),
    requestId: getHeader(req, 'x-request-id'),
  };
}

function resolveBody(body: unknown) {
  if (typeof body === 'string') {
    return JSON.parse(body);
  }
  return body;
}

export function createExpressIngestHandler(
  server: Server,
  options: ExpressIngestHandlerOptions = {},
) {
  return async function handle(req: ExpressLikeRequest, res: ExpressLikeResponse) {
    if ((req.method ?? 'GET').toUpperCase() !== 'POST') {
      return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    }

    let body: unknown;
    try {
      body = resolveBody(req.body);
    } catch {
      return res.status(400).json({ ok: false, error: 'invalid_json' });
    }

    const context = options.getContext?.(req) ?? extractContextFromExpress(req);
    const result = await server.ingest(body, context);

    if (!result.ok) {
      const status =
        result.error.code === 'storage_error'
          ? 500
          : result.error.code === 'invalid_payload' || result.error.code === 'schema_mismatch'
            ? 422
            : 403;

      return res.status(status).json({ ok: false, error: result.error });
    }

    return res.status(202).json({ ok: true });
  };
}
