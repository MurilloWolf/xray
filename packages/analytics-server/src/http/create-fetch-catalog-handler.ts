import { createAnalyticsServer } from '../create-analytics-server';

type Server = ReturnType<typeof createAnalyticsServer>;

export function createFetchCatalogHandler(server: Server) {
  return async function handle(request: Request): Promise<Response> {
    if (request.method !== 'GET') {
      return Response.json({ ok: false, error: 'method_not_allowed' }, { status: 405 });
    }

    return Response.json({ ok: true, data: server.getCatalog() }, { status: 200 });
  };
}
