import { applyMasking } from './masking';
import { validateAgainstAcceptedTracks, validateBasePayload } from './validation';
import type {
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
          message: 'Falha ao persistir track',
          details: error instanceof Error ? error.message : error,
        },
      };
    }
  }

  return {
    ingest,
  };
}
