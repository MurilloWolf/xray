import { createAnalyticsServer } from '../create-analytics-server';
import {
  createExpressIngestHandler,
  type ExpressIngestHandlerOptions,
  type ExpressLikeRequest,
  type ExpressLikeResponse,
} from './create-express-handler';
import { createFetchIngestHandler } from './create-fetch-handler';

type Server = ReturnType<typeof createAnalyticsServer>;

export type CreateIngestHandlerConfig =
  | {
      adapter?: 'fetch';
    }
  | {
      adapter: 'express';
      express?: ExpressIngestHandlerOptions;
    };

export function createIngestHandler(
  server: Server,
  config?: { adapter?: 'fetch' },
): (request: Request) => Promise<Response>;
export function createIngestHandler(
  server: Server,
  config: { adapter: 'express'; express?: ExpressIngestHandlerOptions },
): (req: ExpressLikeRequest, res: ExpressLikeResponse) => Promise<unknown>;
export function createIngestHandler(server: Server, config: CreateIngestHandlerConfig = {}) {
  if (config.adapter === 'express') {
    return createExpressIngestHandler(server, config.express);
  }

  return createFetchIngestHandler(server);
}
