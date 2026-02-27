import type { ZodType } from 'zod';

export type AnalyticsEventProps = Record<string, unknown>;

export type AnalyticsEventInput = {
  name: string;
  ts?: number;
  appId: string;
  sessionId?: string;
  url?: string;
  path?: string;
  ref?: string;
  environment?: string;
  props?: AnalyticsEventProps;
  tags?: string[];
  clientMeta?: {
    ip?: string;
    userAgent?: string;
    isMobile?: boolean;
    os?: string;
    platform?: string;
    language?: string;
    screen?: {
      width: number;
      height: number;
    };
  };
  writeKey?: string;
};

export type IngestContext = {
  ip?: string;
  userAgent?: string;
  headers?: Record<string, string | undefined>;
  requestId?: string;
};

export type StoredAnalyticsEvent = AnalyticsEventInput & {
  ts: number;
  receivedAt: number;
  props: AnalyticsEventProps;
  meta?: {
    ip?: string;
    userAgent?: string;
    requestId?: string;
  };
};

export interface AnalyticsStorageAdapter {
  save: (event: StoredAnalyticsEvent) => Promise<void>;
  getAll: (dateInit?: number, dateEnd?: number) => Promise<StoredAnalyticsEvent[]>;
  clear: (dateInit?: number, dateEnd?: number) => Promise<number>;
}

export type MaskFieldArgs = {
  path: string;
  key: string;
  value: unknown;
  event: StoredAnalyticsEvent;
};

export type MaskConfig = {
  paths?: string[];
  keyPatterns?: RegExp[];
  maskValue?: string;
  maskField?: (args: MaskFieldArgs) => unknown;
};

export type AcceptedTrack = {
  trackName: string;
  schema: ZodType;
  validateOn?: 'props' | 'event';
  version?: number;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  catalogSchema?: Record<string, unknown>;
};

export type AnalyticsTrackCatalogItem = {
  trackName: string;
  validateOn: 'props' | 'event';
  version: number;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  schema?: Record<string, unknown>;
};

export type AnalyticsTrackCatalog = {
  generatedAt: number;
  tracks: AnalyticsTrackCatalogItem[];
};

export type AnalyticsServerConfig = {
  storage: AnalyticsStorageAdapter;
  acceptedTracks?: AcceptedTrack[];
  rejectUnknownTracks?: boolean;
  masking?: MaskConfig;
};

export type IngestErrorCode =
  | 'invalid_payload'
  | 'track_not_allowed'
  | 'schema_mismatch'
  | 'storage_error';

export type IngestResult =
  | {
      ok: true;
      event: StoredAnalyticsEvent;
    }
  | {
      ok: false;
      error: {
        code: IngestErrorCode;
        message: string;
        details?: unknown;
      };
    };
