import { useCallback, useEffect, useMemo, useRef } from 'react';

import { AnalyticsContext } from './context';
import { createCatalogMap, fetchCatalog } from '../runtime/catalog';
import { normalizeEnvironment } from '../runtime/environment';
import { collectTrackClientMetadata } from '../runtime/metadata';
import { getOrCreateSessionId } from '../runtime/session';
import { sendBeaconFirst } from '../runtime/transport';
import type {
  AnalyticsTrackMetadataConfig,
  AnalyticsProviderProps,
  SendTrack,
  TrackCatalogEntry,
  TrackOptions,
  TrackProps,
} from '../shared/types';

export function AnalyticsProvider({
  children,
  appId,
  transport = 'auto',
  bffEndpoint = '/api/track',
  directEndpoint,
  writeKey,
  environment = 'production',
  autoPageViews = true,
  debug = false,
  preferSendBeacon = true,
  metadata,
  catalog,
  catalogEndpoint,
  strictCatalog = false,
}: AnalyticsProviderProps) {
  const sessionIdRef = useRef<string | null>(null);
  const catalogMapRef = useRef<Map<string, TrackCatalogEntry> | null>(
    catalog ? createCatalogMap(catalog) : null,
  );

  if (typeof window !== 'undefined' && !sessionIdRef.current) {
    sessionIdRef.current = getOrCreateSessionId();
  }

  useEffect(() => {
    if (!catalog) return;
    catalogMapRef.current = createCatalogMap(catalog);
  }, [catalog]);

  useEffect(() => {
    if (!catalogEndpoint || typeof window === 'undefined') return;

    let cancelled = false;

    fetchCatalog(catalogEndpoint)
      .then((tracks) => {
        if (cancelled) return;
        catalogMapRef.current = createCatalogMap(tracks);
      })
      .catch((error) => {
        if (!debug) return;
        console.warn(
          '[xray] failed to load track catalog from endpoint',
          error instanceof Error ? error.message : error,
        );
      });

    return () => {
      cancelled = true;
    };
  }, [catalogEndpoint, debug]);

  const base = useMemo(
    () => ({
      appId,
      sessionId: sessionIdRef.current ?? 'unknown',
    }),
    [appId],
  );

  const sendTrack = useCallback<SendTrack>(
    (name, props, tags, options?: TrackOptions) => {
      if (typeof window === 'undefined') return;
      const resolvedEnvironment = normalizeEnvironment(environment);
      const catalogMap = catalogMapRef.current;

      if (catalogMap) {
        const entry = catalogMap.get(name);

        if (!entry) {
          if (debug) {
            console.warn(`[xray] track '${name}' does not exist in the loaded catalog`);
          }

          if (strictCatalog) return;
        } else if (entry.deprecated && debug) {
          console.warn(`[xray] track '${name}' is marked as deprecated in the catalog`);
        }
      }

      (async () => {
        const metadataConfig = (() => {
          if (options?.metadata === undefined) return metadata;
          if (options.metadata === true || options.metadata === false) return options.metadata;

          const baseMetadataConfig =
            typeof metadata === 'object' && metadata
              ? metadata
              : ({} as AnalyticsTrackMetadataConfig);
          return {
            ...baseMetadataConfig,
            ...options.metadata,
          } as AnalyticsTrackMetadataConfig;
        })();

        const clientMeta = await collectTrackClientMetadata(metadataConfig);
        const event = {
          name,
          ts: Date.now(),
          url: window.location.href,
          path: window.location.pathname,
          ref: document.referrer || undefined,
          environment: resolvedEnvironment,
          ...base,
          props: props ?? undefined,
          tags: tags ?? undefined,
          clientMeta: clientMeta ?? undefined,
          writeKey: writeKey ?? undefined,
        };

        if (resolvedEnvironment !== 'production') {
          console.log('[xray][track]', event);
          return;
        }

        const payload = JSON.stringify(event);
        const sendWithTransport = (url: string) =>
          preferSendBeacon
            ? sendBeaconFirst(url, payload)
            : sendBeaconFirst(url, payload, { preferBeacon: false });

        if (transport === 'bff') {
          await sendWithTransport(bffEndpoint);
          return;
        }
        if (transport === 'direct') {
          if (!directEndpoint) return;
          await sendWithTransport(directEndpoint);
          return;
        }

        const r1 = await sendWithTransport(bffEndpoint).catch(() => null);
        if (r1?.ok) return;

        if (directEndpoint) {
          await sendWithTransport(directEndpoint).catch(() => null);
        }
      })().catch(() => {
        // Silently fail for tracking
      });
    },
    [
      base,
      transport,
      bffEndpoint,
      directEndpoint,
      writeKey,
      debug,
      environment,
      strictCatalog,
      preferSendBeacon,
      metadata,
    ],
  );

  useEffect(() => {
    if (!autoPageViews || typeof window === 'undefined') return;
    sendTrack('page_view');
    const notify = () => sendTrack('page_view');
    window.addEventListener('popstate', notify);
    return () => window.removeEventListener('popstate', notify);
  }, [autoPageViews, sendTrack]);

  const value = useMemo(
    () => ({
      track: sendTrack,
      sendTrack,
      trackPageView: (props?: TrackProps, tags?: string[]) => sendTrack('page_view', props, tags),
      trackClickLink: (props?: TrackProps, tags?: string[]) => sendTrack('click_link', props, tags),
      trackRedirect: (props?: TrackProps, tags?: string[]) => sendTrack('redirect', props, tags),
      trackClickButton: (props?: TrackProps, tags?: string[]) =>
        sendTrack('click_button', props, tags),
      trackScroll: (props?: TrackProps, tags?: string[]) => sendTrack('scroll', props, tags),
      trackElementView: (props?: TrackProps, tags?: string[]) =>
        sendTrack('element_view', props, tags),
    }),
    [sendTrack],
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}
