import { z } from 'zod';
import { describe, expect, it } from 'vitest';

import {
  createAnalyticsServer,
  createCatalogHandler,
  createExpressCatalogHandler,
  createFetchCatalogHandler,
  createMemoryAdapter,
} from '../src';

function createMockResponse() {
  const state = {
    statusCode: 200,
    jsonBody: undefined as unknown,
  };

  const res = {
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    json(body: unknown) {
      state.jsonBody = body;
      return body;
    },
  };

  return { res, state };
}

describe('catalog', () => {
  it('returns catalog metadata from accepted tracks', () => {
    const server = createAnalyticsServer({
      storage: createMemoryAdapter(),
      acceptedTracks: [
        {
          trackName: 'checkout_started',
          schema: z.object({ total: z.number() }),
          validateOn: 'props',
          version: 2,
          description: 'Evento de início de checkout',
          tags: ['checkout', 'funnel'],
          catalogSchema: {
            type: 'object',
            properties: {
              total: { type: 'number' },
            },
            required: ['total'],
          },
        },
      ],
    });

    const catalog = server.getCatalog();

    expect(catalog.tracks).toEqual([
      {
        trackName: 'checkout_started',
        validateOn: 'props',
        version: 2,
        description: 'Evento de início de checkout',
        tags: ['checkout', 'funnel'],
        deprecated: undefined,
        schema: {
          type: 'object',
          properties: {
            total: { type: 'number' },
          },
          required: ['total'],
        },
      },
    ]);
    expect(typeof catalog.generatedAt).toBe('number');
  });

  it('serves catalog in fetch handler', async () => {
    const server = createAnalyticsServer({
      storage: createMemoryAdapter(),
      acceptedTracks: [
        {
          trackName: 'page_view',
          schema: z.object({ page: z.string().optional() }),
        },
      ],
    });

    const handler = createFetchCatalogHandler(server);
    const response = await handler(new Request('http://localhost/api/catalog', { method: 'GET' }));
    const payload = (await response.json()) as { ok: boolean; data: { tracks: unknown[] } };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.tracks).toHaveLength(1);
  });

  it('serves catalog in express handler', async () => {
    const server = createAnalyticsServer({
      storage: createMemoryAdapter(),
      acceptedTracks: [
        {
          trackName: 'page_view',
          schema: z.object({ page: z.string().optional() }),
        },
      ],
    });

    const handler = createExpressCatalogHandler(server);
    const { res, state } = createMockResponse();

    await handler({ method: 'GET' }, res);

    expect(state.statusCode).toBe(200);
    expect(state.jsonBody).toEqual(
      expect.objectContaining({
        ok: true,
      }),
    );
  });

  it('supports catalog adapter selection by configuration', async () => {
    const server = createAnalyticsServer({
      storage: createMemoryAdapter(),
    });

    const fetchHandler = createCatalogHandler(server, { adapter: 'fetch' });
    const fetchResponse = await fetchHandler(
      new Request('http://localhost/api/catalog', { method: 'GET' }),
    );
    expect(fetchResponse.status).toBe(200);

    const expressHandler = createCatalogHandler(server, { adapter: 'express' });
    const { res, state } = createMockResponse();
    await expressHandler({ method: 'GET' }, res);
    expect(state.statusCode).toBe(200);
  });
});
