import { applyMasking } from './masking';
import { validateAgainstAcceptedTracks, validateBasePayload } from './validation';
import type {
  AnalyticsTrackCatalog,
  AnalyticsServerConfig,
  IngestContext,
  IngestResult,
  StoredAnalyticsEvent,
} from './types';

function buildStoredEvent(
  input: {
    name: string;
    ts?: number;
    appId: string;
    sessionId?: string;
    url?: string;
    path?: string;
    ref?: string;
    environment?: string;
    props?: Record<string, unknown>;
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
  },
  context?: IngestContext,
): StoredAnalyticsEvent {
  return {
    ...input,
    ts: input.ts ?? Date.now(),
    receivedAt: Date.now(),
    props: input.props ?? {},
    meta: {
      ip: context?.ip,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
    },
  };
}

export function createAnalyticsServer(config: AnalyticsServerConfig) {
  const rejectUnknownTracks = config.rejectUnknownTracks ?? true;
  const generatedAt = Date.now();

  const trackCatalog = (config.acceptedTracks ?? []).map((track) => ({
    trackName: track.trackName,
    validateOn: track.validateOn ?? 'props',
    version: track.version ?? 1,
    description: track.description,
    tags: track.tags,
    deprecated: track.deprecated,
    schema: track.catalogSchema,
  }));

  async function ingest(input: unknown, context?: IngestContext): Promise<IngestResult> {
    const payloadValidation = validateBasePayload(input);
    if (!payloadValidation.ok) return payloadValidation;

    const event = buildStoredEvent(payloadValidation.data, context);

    const trackValidation = validateAgainstAcceptedTracks(
      event,
      config.acceptedTracks,
      rejectUnknownTracks,
    );
    if (trackValidation) return trackValidation;

    const maskedEvent = applyMasking(event, config.masking);

    try {
      await config.storage.save(maskedEvent);
      return {
        ok: true,
        event: maskedEvent,
      };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: 'storage_error',
          message: 'Failed to persist track',
          details: error instanceof Error ? error.message : error,
        },
      };
    }
  }

  function getCatalog(): AnalyticsTrackCatalog {
    return {
      generatedAt,
      tracks: [...trackCatalog],
    };
  }

  return {
    ingest,
    getCatalog,
  };
}
