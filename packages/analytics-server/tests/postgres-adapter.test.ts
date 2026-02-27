import { describe, expect, it, vi } from 'vitest';

import { createPostgresAdapter } from '../src';
import type { StoredAnalyticsEvent } from '../src';

const sampleEvent: StoredAnalyticsEvent = {
  name: 'page_view',
  ts: 1730000000000,
  appId: 'web-app',
  sessionId: 'session-1',
  url: 'https://xray.dev/pricing',
  path: '/pricing',
  ref: 'https://google.com',
  environment: 'production',
  props: { plan: 'pro' },
  tags: ['marketing', 'pricing'],
  clientMeta: {
    userAgent: 'Mozilla/5.0',
    isMobile: false,
    os: 'macos',
  },
  writeKey: 'secret-key',
  receivedAt: 1730000000010,
  meta: {
    ip: '127.0.0.1',
    userAgent: 'vitest',
    requestId: 'req-1',
  },
};

describe('createPostgresAdapter', () => {
  it('maps event to insert query payload', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 1 });
    const adapter = createPostgresAdapter({
      db: { query },
    });

    await adapter.save(sampleEvent);

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];

    expect(sql).toContain('insert into "analytics_events"');
    expect(params).toEqual([
      sampleEvent.name,
      sampleEvent.ts,
      sampleEvent.appId,
      sampleEvent.sessionId,
      sampleEvent.url,
      sampleEvent.path,
      sampleEvent.ref,
      sampleEvent.environment,
      sampleEvent.props,
      sampleEvent.tags,
      sampleEvent.clientMeta,
      sampleEvent.writeKey,
      sampleEvent.receivedAt,
      sampleEvent.meta,
    ]);
  });

  it('uses configured schema and table names', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 1 });
    const adapter = createPostgresAdapter({
      db: { query },
      schemaName: 'analytics',
      tableName: 'events',
    });

    await adapter.save(sampleEvent);

    const [sql] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('insert into "analytics"."events"');
  });

  it('rejects invalid schema or table identifiers', () => {
    expect(() =>
      createPostgresAdapter({
        db: { query: vi.fn() },
        tableName: 'events;drop table users;',
      }),
    ).toThrowError(/Invalid SQL identifier/);
  });

  it('returns stored events with getAll', async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          name: sampleEvent.name,
          ts: sampleEvent.ts,
          app_id: sampleEvent.appId,
          session_id: sampleEvent.sessionId,
          url: sampleEvent.url,
          path: sampleEvent.path,
          ref: sampleEvent.ref,
          environment: sampleEvent.environment,
          props: sampleEvent.props,
          tags: sampleEvent.tags,
          client_meta: sampleEvent.clientMeta,
          write_key: sampleEvent.writeKey,
          received_at: sampleEvent.receivedAt,
          meta: sampleEvent.meta,
        },
      ],
      rowCount: 1,
    });

    const adapter = createPostgresAdapter({
      db: { query },
    });

    const events = await adapter.getAll();

    expect(events).toEqual([sampleEvent]);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('from "analytics_events"');
    expect(params).toEqual([]);
  });

  it('applies date range filters on getAll and clear', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rowCount: 3 });

    const adapter = createPostgresAdapter({
      db: { query },
    });

    await adapter.getAll(1000, 2000);
    const deletedCount = await adapter.clear(1000, 2000);

    const [getAllSql, getAllParams] = query.mock.calls[0] as [string, unknown[]];
    expect(getAllSql).toContain('where ts >= $1 and ts <= $2');
    expect(getAllParams).toEqual([1000, 2000]);

    const [clearSql, clearParams] = query.mock.calls[1] as [string, unknown[]];
    expect(clearSql).toContain('delete from "analytics_events" where ts >= $1 and ts <= $2');
    expect(clearParams).toEqual([1000, 2000]);
    expect(deletedCount).toBe(3);
  });
});
