import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';

import { createAnalyticsServer, createExpressIngestHandler, createIngestHandler } from '../src';
import { createMemoryAdapter } from '../src/adapters/memory-adapter';

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

describe('createExpressIngestHandler', () => {
  it('ingests event and returns 202', async () => {
    const storage = createMemoryAdapter();
    const server = createAnalyticsServer({
      storage,
      acceptedTracks: [
        {
          trackName: 'page_view',
          schema: z.object({ session_id: z.number() }),
          validateOn: 'props',
        },
      ],
    });

    const handler = createExpressIngestHandler(server);
    const { res, state } = createMockResponse();

    await handler(
      {
        method: 'POST',
        body: {
          name: 'page_view',
          appId: 'web-app',
          props: { session_id: 10 },
        },
        headers: {
          'x-request-id': 'req-123',
        },
        ip: '127.0.0.1',
      },
      res,
    );

    expect(state.statusCode).toBe(202);
    expect(await storage.getAll()).toHaveLength(1);
  });

  it('returns 405 for non POST methods', async () => {
    const storage = createMemoryAdapter();
    const server = createAnalyticsServer({ storage });
    const handler = createExpressIngestHandler(server);
    const { res, state } = createMockResponse();

    await handler(
      {
        method: 'GET',
      },
      res,
    );

    expect(state.statusCode).toBe(405);
  });

  it('supports configuration-based express adapter selection', async () => {
    const storage = createMemoryAdapter();
    const server = createAnalyticsServer({ storage });
    const getContext = vi.fn().mockReturnValue({ requestId: 'config-ctx' });

    const handler = createIngestHandler(server, {
      adapter: 'express',
      express: { getContext },
    });

    const { res, state } = createMockResponse();

    await handler(
      {
        method: 'POST',
        body: {
          name: 'page_view',
          appId: 'web-app',
        },
      },
      res,
    );

    expect(state.statusCode).toBe(202);
    expect(getContext).toHaveBeenCalledTimes(1);
  });
});
