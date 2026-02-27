import type { PropsWithChildren } from 'react';

export type Transport = 'auto' | 'bff' | 'direct';
export type AnalyticsEnvironment = 'local' | 'dev' | 'production';
export type TrackProps = Record<string, unknown>;
export type TrackTags = string[];
export type TrackEventName =
  | 'page_view'
  | 'click_link'
  | 'redirect'
  | 'click_button'
  | 'scroll'
  | 'element_view'
  | (string & {});

export type TrackCatalogEntry = {
  trackName: string;
  validateOn?: 'props' | 'event';
  version?: number;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  schema?: Record<string, unknown>;
};

export type AnalyticsTrackMetadataConfig = {
  enabled?: boolean;
  includeIp?: boolean;
  includeUserAgent?: boolean;
  includeDevice?: boolean;
  includeLanguage?: boolean;
  includeScreen?: boolean;
  staticIp?: string;
  resolveIp?: () => Promise<string | undefined>;
};

export type AnalyticsTrackClientMetadata = {
  ip?: string;
  userAgent?: string;
  isMobile?: boolean;
  os?: 'android' | 'ios' | 'macos' | 'windows' | 'linux' | 'unknown';
  platform?: string;
  language?: string;
  screen?: {
    width: number;
    height: number;
  };
};

export type TrackOptions = {
  metadata?: boolean | AnalyticsTrackMetadataConfig;
};

export type AnalyticsProviderProps = PropsWithChildren<{
  appId: string;
  transport?: Transport;
  bffEndpoint?: string;
  directEndpoint?: string;
  writeKey?: string;
  environment?: AnalyticsEnvironment | string;
  autoPageViews?: boolean;
  debug?: boolean;
  preferSendBeacon?: boolean;
  metadata?: boolean | AnalyticsTrackMetadataConfig;
  catalog?: TrackCatalogEntry[];
  catalogEndpoint?: string;
  strictCatalog?: boolean;
}>;

export type SendTrack = (
  name: TrackEventName,
  props?: TrackProps,
  tags?: TrackTags,
  options?: TrackOptions,
) => void;

export type AnalyticsContextValue = {
  track: SendTrack;
  sendTrack: SendTrack;
  trackPageView: (props?: TrackProps, tags?: TrackTags) => void;
  trackClickLink: (props?: TrackProps, tags?: TrackTags) => void;
  trackRedirect: (props?: TrackProps, tags?: TrackTags) => void;
  trackClickButton: (props?: TrackProps, tags?: TrackTags) => void;
  trackScroll: (props?: TrackProps, tags?: TrackTags) => void;
  trackElementView: (props?: TrackProps, tags?: TrackTags) => void;
};

export type TrackPageViewProps = {
  props?: TrackProps;
  trackOnPopState?: boolean;
};
