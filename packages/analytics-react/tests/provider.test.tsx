import React, { useEffect } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsProvider } from '../src/core/provider';
import { useAnalytics } from '../src/hooks/use-analytics';

const sendBeaconFirstMock = vi.hoisted(() => vi.fn());
const getOrCreateSessionIdMock = vi.hoisted(() => vi.fn(() => 'session-test'));

vi.mock('../src/runtime/transport', () => ({
  sendBeaconFirst: sendBeaconFirstMock,
}));

vi.mock('../src/runtime/session', () => ({
  getOrCreateSessionId: getOrCreateSessionIdMock,
}));

function flushPromises() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function render(ui: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => {
    root.render(ui);
  });

  return {
    rerender(nextUi: React.ReactElement) {
      act(() => {
        root.render(nextUi);
      });
    },
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function TrackHarness({
  onReady,
}: {
  onReady: (track: ReturnType<typeof useAnalytics>['track']) => void;
}) {
  const { track } = useAnalytics();

  useEffect(() => {
    onReady(track);
  }, [onReady, track]);

  return null;
}

describe('AnalyticsProvider', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('logs only in local environment and does not send network request', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    let trackFn: ReturnType<typeof useAnalytics>['track'] | null = null;

    const view = render(
      <AnalyticsProvider appId="app" environment="local" autoPageViews={false}>
        <TrackHarness onReady={(track) => (trackFn = track)} />
      </AnalyticsProvider>,
    );

    act(() => {
      trackFn?.('click_button', { source: 'hero', nested: { a: 1 } });
    });

    await flushPromises();

    expect(sendBeaconFirstMock).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[xray][track]',
      expect.objectContaining({
        appId: 'app',
        environment: 'local',
        name: 'click_button',
        props: { source: 'hero', nested: { a: 1 } },
      }),
    );

    view.unmount();
  });

  it('sends event to bff in production', async () => {
    sendBeaconFirstMock.mockResolvedValue({ ok: true, status: 200 });
    let trackFn: ReturnType<typeof useAnalytics>['track'] | null = null;

    const view = render(
      <AnalyticsProvider
        appId="app"
        environment="production"
        autoPageViews={false}
        transport="bff"
        bffEndpoint="/api/track"
      >
        <TrackHarness onReady={(track) => (trackFn = track)} />
      </AnalyticsProvider>,
    );

    act(() => {
      trackFn?.('click_link', { href: '/pricing' });
    });
    await flushPromises();

    expect(sendBeaconFirstMock).toHaveBeenCalledTimes(1);
    expect(sendBeaconFirstMock).toHaveBeenCalledWith(
      '/api/track',
      expect.stringContaining('"name":"click_link"'),
    );

    view.unmount();
  });

  it('falls back to direct endpoint in auto mode when bff fails', async () => {
    sendBeaconFirstMock
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    let trackFn: ReturnType<typeof useAnalytics>['track'] | null = null;

    const view = render(
      <AnalyticsProvider
        appId="app"
        environment="production"
        autoPageViews={false}
        transport="auto"
        bffEndpoint="/api/track"
        directEndpoint="https://ingest.example/track"
      >
        <TrackHarness onReady={(track) => (trackFn = track)} />
      </AnalyticsProvider>,
    );

    act(() => {
      trackFn?.('redirect', { to: '/checkout' });
    });
    await flushPromises();

    expect(sendBeaconFirstMock).toHaveBeenCalledTimes(2);
    expect(sendBeaconFirstMock).toHaveBeenNthCalledWith(
      1,
      '/api/track',
      expect.stringContaining('"name":"redirect"'),
    );
    expect(sendBeaconFirstMock).toHaveBeenNthCalledWith(
      2,
      'https://ingest.example/track',
      expect.stringContaining('"name":"redirect"'),
    );

    view.unmount();
  });

  it('does not send in direct mode when direct endpoint is missing', async () => {
    let trackFn: ReturnType<typeof useAnalytics>['track'] | null = null;
    const view = render(
      <AnalyticsProvider
        appId="app"
        environment="production"
        autoPageViews={false}
        transport="direct"
      >
        <TrackHarness onReady={(track) => (trackFn = track)} />
      </AnalyticsProvider>,
    );

    act(() => {
      trackFn?.('scroll', { percent: 90 });
    });

    await flushPromises();
    expect(sendBeaconFirstMock).not.toHaveBeenCalled();

    view.unmount();
  });

  it('tracks page views automatically on mount and popstate', async () => {
    sendBeaconFirstMock.mockResolvedValue({ ok: true, status: 200 });

    const view = render(
      <AnalyticsProvider
        appId="app"
        environment="production"
        transport="bff"
        bffEndpoint="/api/track"
      >
        <div />
      </AnalyticsProvider>,
    );

    await flushPromises();
    const initialCount = sendBeaconFirstMock.mock.calls.length;
    expect(initialCount).toBe(1);

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await flushPromises();

    expect(sendBeaconFirstMock.mock.calls.length).toBe(2);

    view.unmount();
  });

  it('exposes helper trackers with custom props payload', async () => {
    sendBeaconFirstMock.mockResolvedValue({ ok: true, status: 200 });

    function HelperHarness() {
      const { trackClickButton, trackElementView } = useAnalytics();

      useEffect(() => {
        trackClickButton({ id: 'save', metadata: { step: 2 } });
        trackElementView({ id: 'banner', visible: true });
      }, [trackClickButton, trackElementView]);

      return null;
    }

    const view = render(
      <AnalyticsProvider appId="app" environment="production" autoPageViews={false} transport="bff">
        <HelperHarness />
      </AnalyticsProvider>,
    );

    await flushPromises();

    expect(sendBeaconFirstMock).toHaveBeenCalledTimes(2);
    expect(sendBeaconFirstMock).toHaveBeenNthCalledWith(
      1,
      '/api/track',
      expect.stringContaining('"name":"click_button"'),
    );
    expect(sendBeaconFirstMock).toHaveBeenNthCalledWith(
      2,
      '/api/track',
      expect.stringContaining('"name":"element_view"'),
    );

    view.unmount();
  });

  it('blocks unknown track names when strictCatalog is enabled', async () => {
    sendBeaconFirstMock.mockResolvedValue({ ok: true, status: 200 });
    let trackFn: ReturnType<typeof useAnalytics>['track'] | null = null;

    const view = render(
      <AnalyticsProvider
        appId="app"
        environment="production"
        autoPageViews={false}
        transport="bff"
        strictCatalog
        catalog={[{ trackName: 'page_view' }]}
      >
        <TrackHarness onReady={(track) => (trackFn = track)} />
      </AnalyticsProvider>,
    );

    act(() => {
      trackFn?.('checkout_started', { total: 100 });
    });
    await flushPromises();

    expect(sendBeaconFirstMock).not.toHaveBeenCalled();

    view.unmount();
  });

  it('loads catalog from endpoint and allows mapped track names', async () => {
    sendBeaconFirstMock.mockResolvedValue({ ok: true, status: 200 });
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          tracks: [{ trackName: 'checkout_started' }],
        },
      }),
    });

    let trackFn: ReturnType<typeof useAnalytics>['track'] | null = null;

    const view = render(
      <AnalyticsProvider
        appId="app"
        environment="production"
        autoPageViews={false}
        transport="bff"
        catalogEndpoint="/api/catalog"
        strictCatalog
      >
        <TrackHarness onReady={(track) => (trackFn = track)} />
      </AnalyticsProvider>,
    );

    await flushPromises();

    act(() => {
      trackFn?.('checkout_started', { total: 100 });
    });
    await flushPromises();

    expect(global.fetch).toHaveBeenCalledWith('/api/catalog', {
      method: 'GET',
      cache: 'no-store',
    });
    expect(sendBeaconFirstMock).toHaveBeenCalledTimes(1);

    view.unmount();
  });

  it('captures default client metadata when metadata is enabled', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    let trackFn: ReturnType<typeof useAnalytics>['track'] | null = null;

    const view = render(
      <AnalyticsProvider appId="app" environment="local" autoPageViews={false} metadata>
        <TrackHarness onReady={(track) => (trackFn = track)} />
      </AnalyticsProvider>,
    );

    act(() => {
      trackFn?.('page_view');
    });

    await flushPromises();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[xray][track]',
      expect.objectContaining({
        clientMeta: expect.objectContaining({
          userAgent: expect.any(String),
          isMobile: expect.any(Boolean),
          os: expect.any(String),
        }),
      }),
    );

    view.unmount();
  });
});
