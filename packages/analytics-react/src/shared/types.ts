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

export type AnalyticsProviderProps = PropsWithChildren<{
  appId: string;
  transport?: Transport;
  bffEndpoint?: string;
  directEndpoint?: string;
  writeKey?: string;
  environment?: AnalyticsEnvironment | string;
  autoPageViews?: boolean;
  debug?: boolean;
}>;

export type SendTrack = (name: TrackEventName, props?: TrackProps, tags?: TrackTags) => void;

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
