import cors from 'cors';
import express from 'express';
import { Pool } from 'pg';
import { z } from 'zod';

import {
  createCatalogHandler,
  createAnalyticsServer,
  createIngestHandler,
  createPostgresAdapter,
} from '../../../packages/analytics-server/src/index.js';

function logInfo(message: string, data?: Record<string, unknown>) {
  if (data) {
    console.log(`[demo-backend] ${message}`, data);
    return;
  }
  console.log(`[demo-backend] ${message}`);
}

function logError(message: string, error: unknown, data?: Record<string, unknown>) {
  console.error(`[demo-backend] ${message}`, {
    ...(data ?? {}),
    error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
  });
}

function toNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseDateRange(query: Record<string, unknown>) {
  const dateInit = toNumber(query.dateInit);
  const dateEnd = toNumber(query.dateEnd);
  return { dateInit, dateEnd };
}

const port = Number(process.env.PORT ?? 4000);
const corsOrigin = process.env.CORS_ORIGIN ?? '*';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://xray:xray@localhost:5432/xray',
});

const storage = createPostgresAdapter({
  db: pool,
  schemaName: process.env.ANALYTICS_SCHEMA ?? 'analytics',
  tableName: process.env.ANALYTICS_TABLE ?? 'events',
});

const analyticsServer = createAnalyticsServer({
  storage,
  acceptedTracks: [
    {
      trackName: 'click_button',
      schema: z.object({ id: z.string() }).passthrough(),
      validateOn: 'props',
      version: 1,
      description: 'Clique em botão de ação',
      tags: ['ui', 'interaction'],
      catalogSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
    {
      trackName: 'click_link',
      schema: z.object({ href: z.string().optional() }).passthrough(),
      validateOn: 'props',
      version: 1,
      description: 'Clique em link',
      tags: ['ui', 'navigation'],
      catalogSchema: {
        type: 'object',
        properties: {
          href: { type: 'string' },
        },
      },
    },
    {
      trackName: 'page_view',
      schema: z.object({ page: z.string().optional() }).passthrough(),
      validateOn: 'props',
      version: 1,
      description: 'Visualização de página',
      tags: ['navigation'],
      catalogSchema: {
        type: 'object',
        properties: {
          page: { type: 'string' },
        },
      },
    },
    {
      trackName: 'scroll',
      schema: z.object({ depth: z.number().optional() }).passthrough(),
      validateOn: 'props',
      version: 1,
      description: 'Evento de scroll',
      tags: ['ui', 'engagement'],
      catalogSchema: {
        type: 'object',
        properties: {
          depth: { type: 'number' },
        },
      },
    },
    {
      trackName: 'element_view',
      schema: z.object({ id: z.string(), visible: z.boolean() }).passthrough(),
      validateOn: 'props',
      version: 1,
      description: 'Visualização de elemento',
      tags: ['ui', 'visibility'],
      catalogSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          visible: { type: 'boolean' },
        },
        required: ['id', 'visible'],
      },
    },
    {
      trackName: 'custom_demo_event',
      schema: z.object({ custom: z.boolean().optional() }).passthrough(),
      validateOn: 'props',
      version: 1,
      description: 'Evento customizado para demo',
      tags: ['custom'],
      catalogSchema: {
        type: 'object',
        properties: {
          custom: { type: 'boolean' },
        },
      },
    },
  ],
  rejectUnknownTracks: true,
});

const ingestHandler = createIngestHandler(analyticsServer, {
  adapter: 'express',
});
const catalogHandler = createCatalogHandler(analyticsServer, {
  adapter: 'express',
});

const app = express();
app.set('etag', false);

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '50kb' }));
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  next();
});

app.use((req, res, next) => {
  const startedAt = Date.now();
  const requestMeta = {
    method: req.method,
    path: req.path,
    query: req.query,
    requestId: req.headers['x-request-id'] ?? undefined,
  };

  logInfo('request.received', requestMeta);

  res.on('finish', () => {
    logInfo('request.completed', {
      ...requestMeta,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
});

app.get('/api/health', async (req, res, next) => {
  try {
    await pool.query('select 1');
    logInfo('health.ok', { path: req.path });
    return res.status(200).json({ ok: true });
  } catch (error) {
    logError('health.failed', error, { path: req.path });
    return next(error);
  }
});

app.post('/api/track', async (req, res, next) => {
  const body = req.body as Record<string, unknown> | undefined;
  logInfo('track.received', {
    path: req.path,
    trackName: typeof body?.name === 'string' ? body.name : undefined,
    appId: typeof body?.appId === 'string' ? body.appId : undefined,
    hasProps: typeof body?.props === 'object' && body?.props !== null,
  });

  try {
    await ingestHandler(req, res);
    logInfo('track.ingest.finished', {
      path: req.path,
      statusCode: res.statusCode,
      trackName: typeof body?.name === 'string' ? body.name : undefined,
    });
  } catch (error) {
    logError('track.ingest.failed', error, {
      path: req.path,
      trackName: typeof body?.name === 'string' ? body.name : undefined,
    });
    return next(error);
  }
});

app.get('/api/catalog', async (req, res, next) => {
  try {
    await catalogHandler(req, res);
  } catch (error) {
    logError('catalog.failed', error, { path: req.path });
    return next(error);
  }
});

app.get('/api/tracks', async (req, res, next) => {
  try {
    const { dateInit, dateEnd } = parseDateRange(req.query as Record<string, unknown>);
    const events = await storage.getAll(dateInit, dateEnd);
    logInfo('tracks.listed', {
      path: req.path,
      dateInit,
      dateEnd,
      count: events.length,
    });
    return res.status(200).json({ ok: true, count: events.length, data: events });
  } catch (error) {
    logError('tracks.list.failed', error, {
      path: req.path,
      query: req.query as Record<string, unknown>,
    });
    return next(error);
  }
});

app.delete('/api/tracks', async (req, res, next) => {
  try {
    const { dateInit, dateEnd } = parseDateRange(req.query as Record<string, unknown>);
    const removed = await storage.clear(dateInit, dateEnd);
    logInfo('tracks.cleared', {
      path: req.path,
      dateInit,
      dateEnd,
      removed,
    });
    return res.status(200).json({ ok: true, removed });
  } catch (error) {
    logError('tracks.clear.failed', error, {
      path: req.path,
      query: req.query as Record<string, unknown>,
    });
    return next(error);
  }
});

app.use(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    logError('request.unhandled_error', error, {
      method: req.method,
      path: req.path,
    });
    return res.status(500).json({ ok: false, error: message });
  },
);

app.listen(port, () => {
  console.log(`[demo-backend] running on http://localhost:${port}`);
});
