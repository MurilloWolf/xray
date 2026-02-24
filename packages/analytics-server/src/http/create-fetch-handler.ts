import type { IngestContext } from '../types';
import { createAnalyticsServer } from '../create-analytics-server';

type Server = ReturnType<typeof createAnalyticsServer>;

function extractContext(request: Request): IngestContext {
  return {
    ip: request.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
    requestId: request.headers.get('x-request-id') ?? undefined,
  };
}

export function createFetchIngestHandler(server: Server) {
  return async function handle(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return Response.json({ ok: false, error: 'method_not_allowed' }, { status: 405 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ ok: false, error: 'invalid_json' }, { status: 400 });
    }

    const result = await server.ingest(body, extractContext(request));

    if (!result.ok) {
      const status =
        result.error.code === 'storage_error'
          ? 500
          : result.error.code === 'invalid_payload' || result.error.code === 'schema_mismatch'
            ? 422
            : 403;

      return Response.json({ ok: false, error: result.error }, { status });
    }

    return Response.json({ ok: true }, { status: 202 });
  };
}
