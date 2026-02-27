import { useContext, useMemo } from 'react';

import { AnalyticsContext } from '../core/context';
import type {
  AnalyticsTrackMetadataConfig,
  TrackEventName,
  TrackProps,
  TrackTags,
} from '../shared/types';

type UseAnalyticsOptions = {
  metadata?: boolean | AnalyticsTrackMetadataConfig;
};

export function useAnalytics(options?: UseAnalyticsOptions) {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) throw new Error('useAnalytics must be used within AnalyticsProvider');

  const metadataOption = options?.metadata;

  const wrapped = useMemo(
    () => ({
      ...ctx,
      track: (name: TrackEventName, props?: TrackProps, tags?: TrackTags) =>
        ctx.track(name, props, tags, { metadata: metadataOption }),
      sendTrack: (name: TrackEventName, props?: TrackProps, tags?: TrackTags) =>
        ctx.sendTrack(name, props, tags, { metadata: metadataOption }),
      trackPageView: (props?: TrackProps, tags?: TrackTags) =>
        ctx.track('page_view', props, tags, { metadata: metadataOption }),
      trackClickLink: (props?: TrackProps, tags?: TrackTags) =>
        ctx.track('click_link', props, tags, { metadata: metadataOption }),
      trackRedirect: (props?: TrackProps, tags?: TrackTags) =>
        ctx.track('redirect', props, tags, { metadata: metadataOption }),
      trackClickButton: (props?: TrackProps, tags?: TrackTags) =>
        ctx.track('click_button', props, tags, { metadata: metadataOption }),
      trackScroll: (props?: TrackProps, tags?: TrackTags) =>
        ctx.track('scroll', props, tags, { metadata: metadataOption }),
      trackElementView: (props?: TrackProps, tags?: TrackTags) =>
        ctx.track('element_view', props, tags, { metadata: metadataOption }),
    }),
    [ctx, metadataOption],
  );

  return metadataOption ? wrapped : ctx;
}
