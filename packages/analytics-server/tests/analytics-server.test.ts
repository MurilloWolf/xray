import { z } from 'zod';
import { describe, expect, it } from 'vitest';

import { createAnalyticsServer, createFetchIngestHandler, createMemoryAdapter } from '../src';

describe('createAnalyticsServer', () => {
  it('stores valid track that matches accepted schema', async () => {
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

    const result = await server.ingest({
      name: 'page_view',
      appId: 'web-app',
      props: { session_id: 123 },
    });

    expect(result.ok).toBe(true);
    const events = await storage.getAll();
    expect(events).toHaveLength(1);
    expect(events[0]?.props.session_id).toBe(123);
  });

  it('rejects track when schema does not match', async () => {
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

    const result = await server.ingest({
      name: 'page_view',
      appId: 'web-app',
      props: { session_id: 'abc' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('schema_mismatch');
    await expect(storage.getAll()).resolves.toHaveLength(0);
  });

  it('rejects unknown tracks by default when acceptedTracks is configured', async () => {
    const storage = createMemoryAdapter();
    const server = createAnalyticsServer({
      storage,
      acceptedTracks: [
        {
          trackName: 'page_view',
          schema: z.object({ session_id: z.number() }),
        },
      ],
    });

    const result = await server.ingest({
      name: 'checkout_started',
      appId: 'web-app',
      props: { total: 123 },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('track_not_allowed');
    await expect(storage.getAll()).resolves.toHaveLength(0);
  });

  it('can allow unknown tracks when rejectUnknownTracks is false', async () => {
    const storage = createMemoryAdapter();
    const server = createAnalyticsServer({
      storage,
      acceptedTracks: [
        {
          trackName: 'page_view',
          schema: z.object({ session_id: z.number() }),
        },
      ],
      rejectUnknownTracks: false,
    });

    const result = await server.ingest({
      name: 'checkout_started',
      appId: 'web-app',
      props: { total: 123 },
    });

    expect(result.ok).toBe(true);
    await expect(storage.getAll()).resolves.toHaveLength(1);
  });

  it('masks sensitive fields by path and key pattern before save', async () => {
    const storage = createMemoryAdapter();
    const server = createAnalyticsServer({
      storage,
      acceptedTracks: [
        {
          trackName: 'signup',
          schema: z.object({
            user: z.object({
              email: z.string(),
              password: z.string(),
            }),
          }),
        },
      ],
      masking: {
        paths: ['user.email'],
        keyPatterns: [/password/i],
        maskValue: '[masked]',
      },
    });

    const result = await server.ingest({
      name: 'signup',
      appId: 'web-app',
      props: {
        user: {
          email: 'john@xray.dev',
          password: 'super-secret',
        },
      },
    });

    expect(result.ok).toBe(true);
    const saved = (await storage.getAll())[0];
    expect(saved?.props.user).toEqual({
      email: '[masked]',
      password: '[masked]',
    });
  });

  it('returns storage_error when adapter fails', async () => {
    const server = createAnalyticsServer({
      storage: {
        async save() {
          throw new Error('db offline');
        },
        async getAll() {
          return [];
        },
        async clear() {
          return 0;
        },
      },
    });

    const result = await server.ingest({
      name: 'page_view',
      appId: 'web-app',
      props: {},
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('storage_error');
  });
});

describe('createFetchIngestHandler', () => {
  it('ingests event and returns 202', async () => {
    const storage = createMemoryAdapter();
    const server = createAnalyticsServer({
      storage,
      acceptedTracks: [
        {
          trackName: 'page_view',
          schema: z.object({ session_id: z.number() }),
        },
      ],
    });
    const handler = createFetchIngestHandler(server);

    const request = new Request('http://localhost/api/track', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'page_view',
        appId: 'web-app',
        props: { session_id: 999 },
      }),
    });

    const response = await handler(request);

    expect(response.status).toBe(202);
    await expect(storage.getAll()).resolves.toHaveLength(1);
  });

  it('returns 422 when request payload does not match schema', async () => {
    const storage = createMemoryAdapter();
    const server = createAnalyticsServer({
      storage,
      acceptedTracks: [
        {
          trackName: 'page_view',
          schema: z.object({ session_id: z.number() }),
        },
      ],
    });
    const handler = createFetchIngestHandler(server);

    const request = new Request('http://localhost/api/track', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'page_view',
        appId: 'web-app',
        props: { session_id: '999' },
      }),
    });

    const response = await handler(request);

    expect(response.status).toBe(422);
    await expect(storage.getAll()).resolves.toHaveLength(0);
  });
});
