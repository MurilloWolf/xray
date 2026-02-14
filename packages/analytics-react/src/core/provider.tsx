import { useCallback, useEffect, useMemo, useRef } from 'react';

import { AnalyticsContext } from './context';
import { normalizeEnvironment } from '../runtime/environment';
import { getOrCreateSessionId } from '../runtime/session';
import { sendBeaconFirst } from '../runtime/transport';
import type { AnalyticsProviderProps, SendTrack, TrackProps } from '../shared/types';

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
}: AnalyticsProviderProps) {
  const sessionIdRef = useRef<string | null>(null);

  if (typeof window !== 'undefined' && !sessionIdRef.current) {
    sessionIdRef.current = getOrCreateSessionId();
  }

  const base = useMemo(
    () => ({
      appId,
      sessionId: sessionIdRef.current ?? 'unknown',
    }),
    [appId],
  );

  const sendTrack = useCallback<SendTrack>(
    (name, props) => {
      if (typeof window === 'undefined') return;
      const resolvedEnvironment = normalizeEnvironment(environment);

      const event = {
        name,
        ts: Date.now(),
        url: window.location.href,
        path: window.location.pathname,
        ref: document.referrer || undefined,
        environment: resolvedEnvironment,
        ...base,
        props: props ?? undefined,
        writeKey: writeKey ?? undefined,
      };

      if (resolvedEnvironment !== 'production') {
        console.log('[xray][track]', event);
        return;
      }

      const payload = JSON.stringify(event);

      (async () => {
        if (transport === 'bff') {
          await sendBeaconFirst(bffEndpoint, payload);
          return;
        }
        if (transport === 'direct') {
          if (!directEndpoint) return;
          await sendBeaconFirst(directEndpoint, payload);
          return;
        }

        const r1 = await sendBeaconFirst(bffEndpoint, payload).catch(() => null);
        if (r1?.ok) return;

        if (directEndpoint) {
          await sendBeaconFirst(directEndpoint, payload).catch(() => null);
        }
      })().catch(() => {
        // Silently fail for tracking
      });
      if (debug) console.log('[xray]', event);
    },
    [base, transport, bffEndpoint, directEndpoint, writeKey, debug, environment],
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
      trackPageView: (props?: TrackProps) => sendTrack('page_view', props),
      trackClickLink: (props?: TrackProps) => sendTrack('click_link', props),
      trackRedirect: (props?: TrackProps) => sendTrack('redirect', props),
      trackClickButton: (props?: TrackProps) => sendTrack('click_button', props),
      trackScroll: (props?: TrackProps) => sendTrack('scroll', props),
      trackElementView: (props?: TrackProps) => sendTrack('element_view', props),
    }),
    [sendTrack],
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}