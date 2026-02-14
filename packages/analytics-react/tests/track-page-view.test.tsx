import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

import { AnalyticsContext } from '../src/core/context';
import { TrackPageView, useTrackPageView } from '../src/hooks/track-page-view';
import { useAnalytics } from '../src/hooks/use-analytics';

function render(ui: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  act(() => {
    root.render(ui);
  });

  return {
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('useAnalytics', () => {
  it('throws when used outside AnalyticsProvider', () => {
    function InvalidConsumer() {
      useAnalytics();
      return null;
    }

    expect(() => render(<InvalidConsumer />)).toThrow(
      'useAnalytics must be used within AnalyticsProvider',
    );
  });
});

describe('TrackPageView / useTrackPageView', () => {
  it('tracks on mount and popstate by default', () => {
    const trackPageView = vi.fn();
    const view = render(
      <AnalyticsContext.Provider
        value={{
          track: vi.fn(),
          sendTrack: vi.fn(),
          trackPageView,
          trackClickLink: vi.fn(),
          trackRedirect: vi.fn(),
          trackClickButton: vi.fn(),
          trackScroll: vi.fn(),
          trackElementView: vi.fn(),
        }}
      >
        <TrackPageView props={{ page: 'home' }} />
      </AnalyticsContext.Provider>,
    );

    expect(trackPageView).toHaveBeenCalledWith({ page: 'home' });

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(trackPageView).toHaveBeenCalledTimes(2);
    view.unmount();
  });

  it('does not attach popstate tracking when trackOnPopState is false', () => {
    const trackPageView = vi.fn();

    function HookConsumer() {
      useTrackPageView({ page: 'pricing' }, false);
      return null;
    }

    const view = render(
      <AnalyticsContext.Provider
        value={{
          track: vi.fn(),
          sendTrack: vi.fn(),
          trackPageView,
          trackClickLink: vi.fn(),
          trackRedirect: vi.fn(),
          trackClickButton: vi.fn(),
          trackScroll: vi.fn(),
          trackElementView: vi.fn(),
        }}
      >
        <HookConsumer />
      </AnalyticsContext.Provider>,
    );

    expect(trackPageView).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(trackPageView).toHaveBeenCalledTimes(1);
    view.unmount();
  });
});