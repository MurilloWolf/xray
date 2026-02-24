import { z } from 'zod';

import type { AcceptedTrack, IngestResult, StoredAnalyticsEvent } from './types';

const baseEventSchema = z.object({
  name: z.string().min(1),
  ts: z.number().optional(),
  appId: z.string().min(1),
  sessionId: z.string().optional(),
  url: z.string().optional(),
  path: z.string().optional(),
  ref: z.string().optional(),
  environment: z.string().optional(),
  props: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  writeKey: z.string().optional(),
});

export function validateBasePayload(input: unknown) {
  const parsed = baseEventSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'invalid_payload',
        message: 'Payload de track inválido',
        details: parsed.error.issues,
      },
    } satisfies IngestResult;
  }

  return { ok: true, data: parsed.data } as const;
}

export function validateAgainstAcceptedTracks(
  event: StoredAnalyticsEvent,
  acceptedTracks: AcceptedTrack[] | undefined,
  rejectUnknownTracks: boolean,
): IngestResult | null {
  if (!acceptedTracks || acceptedTracks.length === 0) return null;

  const trackConfig = acceptedTracks.find((item) => item.trackName === event.name);

  if (!trackConfig) {
    if (!rejectUnknownTracks) return null;
    return {
      ok: false,
      error: {
        code: 'track_not_allowed',
        message: `Track '${event.name}' não está na lista de tracks permitidos`,
      },
    };
  }

  const target = trackConfig.validateOn === 'event' ? event : event.props;
  const parsed = trackConfig.schema.safeParse(target);

  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'schema_mismatch',
        message: `Track '${event.name}' não bate com schema configurado`,
        details: parsed.error.issues,
      },
    };
  }

  return null;
}
