import { useEffect } from 'react';

import { useAnalytics } from './use-analytics';
import type { TrackPageViewProps, TrackProps } from '../shared/types';

export function useTrackPageView(props?: TrackProps, trackOnPopState = true) {
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    trackPageView(props);

    if (!trackOnPopState) return;
    const notify = () => trackPageView(props);
    window.addEventListener('popstate', notify);
    return () => window.removeEventListener('popstate', notify);
  }, [trackPageView, props, trackOnPopState]);
}

export function TrackPageView({ props, trackOnPopState = true }: TrackPageViewProps) {
  useTrackPageView(props, trackOnPopState);
  return null;
}