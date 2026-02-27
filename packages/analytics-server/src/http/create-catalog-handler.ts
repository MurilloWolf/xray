import { createAnalyticsServer } from '../create-analytics-server';
import { createExpressCatalogHandler } from './create-express-catalog-handler';
import { type ExpressLikeRequest, type ExpressLikeResponse } from './create-express-handler';
import { createFetchCatalogHandler } from './create-fetch-catalog-handler';

type Server = ReturnType<typeof createAnalyticsServer>;

export type CreateCatalogHandlerConfig =
  | {
      adapter?: 'fetch';
    }
  | {
      adapter: 'express';
    };

export function createCatalogHandler(
  server: Server,
  config?: { adapter?: 'fetch' },
): (request: Request) => Promise<Response>;
export function createCatalogHandler(
  server: Server,
  config: { adapter: 'express' },
): (req: ExpressLikeRequest, res: ExpressLikeResponse) => Promise<unknown>;
export function createCatalogHandler(server: Server, config: CreateCatalogHandlerConfig = {}) {
  if (config.adapter === 'express') {
    return createExpressCatalogHandler(server);
  }

  return createFetchCatalogHandler(server);
}
