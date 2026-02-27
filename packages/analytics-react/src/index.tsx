export { AnalyticsProvider } from './core/provider';
export { TrackPageView, useTrackPageView } from './hooks/track-page-view';
export { useAnalytics } from './hooks/use-analytics';
export type {
  AnalyticsEnvironment,
  AnalyticsProviderProps,
  AnalyticsTrackClientMetadata,
  AnalyticsTrackMetadataConfig,
  SendTrack,
  TrackCatalogEntry,
  TrackEventName,
  TrackOptions,
  TrackPageViewProps,
  TrackProps,
  Transport,
} from './shared/types';
