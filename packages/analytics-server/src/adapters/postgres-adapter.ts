import type { AnalyticsStorageAdapter, StoredAnalyticsEvent } from '../types';

export type PostgresQueryable = {
  query: (text: string, values?: unknown[]) => Promise<unknown>;
};

export type PostgresAdapterOptions = {
  db: PostgresQueryable;
  tableName?: string;
  schemaName?: string;
};

type PostgresQueryResult = {
  rows?: unknown[];
  rowCount?: number;
};

type StoredAnalyticsEventRow = {
  name: string;
  ts: number;
  app_id: string;
  session_id: string | null;
  url: string | null;
  path: string | null;
  ref: string | null;
  environment: string | null;
  props: Record<string, unknown> | null;
  tags: string[] | null;
  write_key: string | null;
  received_at: number;
  meta: {
    ip?: string;
    userAgent?: string;
    requestId?: string;
  } | null;
};

function quoteIdentifier(identifier: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Identificador SQL inválido: '${identifier}'`);
  }
  return `"${identifier}"`;
}

function buildDateRangeWhereClause(dateInit?: number, dateEnd?: number) {
  const conditions: string[] = [];
  const values: number[] = [];

  if (dateInit !== undefined) {
    conditions.push(`ts >= $${values.length + 1}`);
    values.push(dateInit);
  }

  if (dateEnd !== undefined) {
    conditions.push(`ts <= $${values.length + 1}`);
    values.push(dateEnd);
  }

  if (conditions.length === 0) {
    return { whereClause: '', values };
  }

  return {
    whereClause: ` where ${conditions.join(' and ')}`,
    values,
  };
}

function mapRowToStoredEvent(row: StoredAnalyticsEventRow): StoredAnalyticsEvent {
  return {
    name: row.name,
    ts: row.ts,
    appId: row.app_id,
    sessionId: row.session_id ?? undefined,
    url: row.url ?? undefined,
    path: row.path ?? undefined,
    ref: row.ref ?? undefined,
    environment: row.environment ?? undefined,
    props: row.props ?? {},
    tags: row.tags ?? undefined,
    writeKey: row.write_key ?? undefined,
    receivedAt: row.received_at,
    meta: row.meta ?? undefined,
  };
}

function extractQueryResultData(result: unknown): PostgresQueryResult {
  if (typeof result === 'object' && result !== null) {
    return result as PostgresQueryResult;
  }

  return {};
}

export function createPostgresAdapter({
  db,
  tableName = 'analytics_events',
  schemaName,
}: PostgresAdapterOptions): AnalyticsStorageAdapter {
  const tableRef = schemaName
    ? `${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`
    : quoteIdentifier(tableName);

  return {
    async save(event: StoredAnalyticsEvent) {
      await db.query(
        `
          insert into ${tableRef}
            (name, ts, app_id, session_id, url, path, ref, environment, props, tags, write_key, received_at, meta)
          values
            ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::text[], $11, $12, $13::jsonb)
        `,
        [
          event.name,
          event.ts,
          event.appId,
          event.sessionId ?? null,
          event.url ?? null,
          event.path ?? null,
          event.ref ?? null,
          event.environment ?? null,
          event.props,
          event.tags ?? null,
          event.writeKey ?? null,
          event.receivedAt,
          event.meta ?? null,
        ],
      );
    },

    async getAll(dateInit?: number, dateEnd?: number) {
      const { whereClause, values } = buildDateRangeWhereClause(dateInit, dateEnd);

      const result = await db.query(
        `
          select
            name,
            ts,
            app_id,
            session_id,
            url,
            path,
            ref,
            environment,
            props,
            tags,
            write_key,
            received_at,
            meta
          from ${tableRef}${whereClause}
          order by ts asc
        `,
        values,
      );

      const rows = extractQueryResultData(result).rows ?? [];
      return rows.map((row) => mapRowToStoredEvent(row as StoredAnalyticsEventRow));
    },

    async clear(dateInit?: number, dateEnd?: number) {
      const { whereClause, values } = buildDateRangeWhereClause(dateInit, dateEnd);

      const result = await db.query(`delete from ${tableRef}${whereClause}`, values);

      return extractQueryResultData(result).rowCount ?? 0;
    },
  };
}
