import type { PropsWithChildren } from 'react';

export type Transport = 'auto' | 'bff' | 'direct';
export type AnalyticsEnvironment = 'local' | 'dev' | 'production';
export type TrackProps = Record<string, unknown>;
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

export type SendTrack = (name: TrackEventName, props?: TrackProps) => void;

export type AnalyticsContextValue = {
  track: SendTrack;
  sendTrack: SendTrack;
  trackPageView: (props?: TrackProps) => void;
  trackClickLink: (props?: TrackProps) => void;
  trackRedirect: (props?: TrackProps) => void;
  trackClickButton: (props?: TrackProps) => void;
  trackScroll: (props?: TrackProps) => void;
  trackElementView: (props?: TrackProps) => void;
};

export type TrackPageViewProps = {
  props?: TrackProps;
  trackOnPopState?: boolean;
};