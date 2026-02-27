import { createAnalyticsServer } from '../create-analytics-server';
import type { ExpressLikeRequest, ExpressLikeResponse } from './create-express-handler';

type Server = ReturnType<typeof createAnalyticsServer>;

export function createExpressCatalogHandler(server: Server) {
  return async function handle(req: ExpressLikeRequest, res: ExpressLikeResponse) {
    if ((req.method ?? 'GET').toUpperCase() !== 'GET') {
      return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    }

    return res.status(200).json({ ok: true, data: server.getCatalog() });
  };
}
