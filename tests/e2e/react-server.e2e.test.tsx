import http from 'node:http';
import type { AddressInfo } from 'node:net';

import React, { useEffect } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import {
  createAnalyticsServer,
  createFetchCatalogHandler,
  createFetchIngestHandler,
  createMemoryAdapter,
} from '../../packages/analytics-server/src';
import { AnalyticsProvider } from '../../packages/analytics-react/src/core/provider';
import { useAnalytics } from '../../packages/analytics-react/src/hooks/use-analytics';

type RunningServer = {
  baseUrl: string;
  close: () => Promise<void>;
};

type RunningStatusServer = RunningServer & {
  getHits: () => number;
};

function readIncomingMessage(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function startTestServer(
  handler: (request: Request) => Promise<Response>,
): Promise<RunningServer> {
  const server = http.createServer(async (req, res) => {
    const bodyBuffer = await readIncomingMessage(req);
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}${req.url ?? '/'}`;

    const request = new Request(url, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body:
        req.method === 'GET' || req.method === 'HEAD' || bodyBuffer.length === 0
          ? undefined
          : new Uint8Array(bodyBuffer),
    });

    const response = await handler(request);

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const text = await response.text();
    res.end(text);
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    close() {
      return new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    },
  };
}

async function startStatusServer(status: number): Promise<RunningStatusServer> {
  let hits = 0;

  const server = http.createServer((_req, res) => {
    hits += 1;
    res.statusCode = status;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ ok: status >= 200 && status < 300 }));
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    getHits() {
      return hits;
    },
    close() {
      return new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    },
  };
}

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

async function waitFor(assertion: () => void | Promise<void>, timeoutMs = 3000, intervalMs = 25) {
  const start = Date.now();
  let lastError: unknown;

  while (Date.now() - start < timeoutMs) {
    try {
      await assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Timeout aguardando condição');
}

function TrackOnMount({ eventName, props }: { eventName: string; props: Record<string, unknown> }) {
  const { track } = useAnalytics();

  useEffect(() => {
    track(eventName as never, props);
  }, [eventName, props, track]);

  return null;
}

describe('E2E: analytics-react -> analytics-server', () => {
  let runningServer: RunningServer | null = null;
  let secondaryServer: RunningServer | null = null;

  beforeEach(() => {
    runningServer = null;
    secondaryServer = null;
  });

  afterEach(async () => {
    if (runningServer) {
      await runningServer.close();
      runningServer = null;
    }

    if (secondaryServer) {
      await secondaryServer.close();
      secondaryServer = null;
    }
  });

  it('stores valid track sent by react client', async () => {
    const storage = createMemoryAdapter();
    const server = createAnalyticsServer({
      storage,
      acceptedTracks: [
        {
          trackName: 'page_view',
          schema: z.object({ session_id: z.number() }),
          validateOn: 'props',
        },
      ],
    });

    const handler = createFetchIngestHandler(server);
    runningServer = await startTestServer(handler);

    const view = render(
      <AnalyticsProvider
        appId="e2e-app"
        environment="production"
        transport="direct"
        directEndpoint={`${runningServer.baseUrl}/api/track`}
        autoPageViews={false}
      >
        <TrackOnMount eventName="page_view" props={{ session_id: 123 }} />
      </AnalyticsProvider>,
    );

    await waitFor(async () => {
      expect(await storage.getAll()).toHaveLength(1);
    });

    const stored = (await storage.getAll())[0];
    expect(stored?.name).toBe('page_view');
    expect(stored?.props.session_id).toBe(123);

    view.unmount();
  });

  it('stores click and view tracks in production', async () => {
    const storage = createMemoryAdapter();
    const server = createAnalyticsServer({
      storage,
      acceptedTracks: [
        {
          trackName: 'click_button',
          schema: z.object({ id: z.string() }),
          validateOn: 'props',
        },
        {
          trackName: 'element_view',
          schema: z.object({ id: z.string(), visible: z.boolean() }),
          validateOn: 'props',
        },
      ],
    });

    const handler = createFetchIngestHandler(server);
    runningServer = await startTestServer(handler);

    const clickView = render(
      <AnalyticsProvider
        appId="e2e-app"
        environment="production"
        transport="direct"
        directEndpoint={`${runningServer.baseUrl}/api/track`}
        autoPageViews={false}
      >
        <TrackOnMount eventName="click_button" props={{ id: 'buy-now' }} />
      </AnalyticsProvider>,
    );

    await waitFor(async () => {
      expect(await storage.getAll()).toHaveLength(1);
    });

    clickView.unmount();

    const viewTrack = render(
      <AnalyticsProvider
        appId="e2e-app"
        environment="production"
        transport="direct"
        directEndpoint={`${runningServer.baseUrl}/api/track`}
        autoPageViews={false}
      >
        <TrackOnMount eventName="element_view" props={{ id: 'hero-banner', visible: true }} />
      </AnalyticsProvider>,
    );

    await waitFor(async () => {
      expect(await storage.getAll()).toHaveLength(2);
    });

    expect((await storage.getAll())[0]?.name).toBe('click_button');
    expect((await storage.getAll())[1]?.name).toBe('element_view');

    viewTrack.unmount();
  });

  it('stores custom tracks when rejectUnknownTracks is false', async () => {
    const storage = createMemoryAdapter();
    const server = createAnalyticsServer({
      storage,
      acceptedTracks: [
        {
          trackName: 'page_view',
          schema: z.object({ session_id: z.number() }),
          validateOn: 'props',
        },
      ],
      rejectUnknownTracks: false,
    });

    const handler = createFetchIngestHandler(server);
    runningServer = await startTestServer(handler);

    const view = render(
      <AnalyticsProvider
        appId="e2e-app"
        environment="production"
        transport="direct"
        directEndpoint={`${runningServer.baseUrl}/api/track`}
        autoPageViews={false}
      >
        <TrackOnMount eventName="custom_checkout_step" props={{ step: 2, flow: 'guest' }} />
      </AnalyticsProvider>,
    );

    await waitFor(async () => {
      expect(await storage.getAll()).toHaveLength(1);
    });

    expect((await storage.getAll())[0]?.name).toBe('custom_checkout_step');
    expect((await storage.getAll())[0]?.props.step).toBe(2);

    view.unmount();
  });

  it('uses transport auto fallback from bff to direct when bff fails', async () => {
    const storage = createMemoryAdapter();
    const server = createAnalyticsServer({
      storage,
      acceptedTracks: [
        {
          trackName: 'page_view',
          schema: z.object({ session_id: z.number() }),
          validateOn: 'props',
        },
      ],
    });

    const directHandler = createFetchIngestHandler(server);
    runningServer = await startTestServer(directHandler);
    secondaryServer = await startStatusServer(500);

    const view = render(
      <AnalyticsProvider
        appId="e2e-app"
        environment="production"
        transport="auto"
        bffEndpoint={`${secondaryServer.baseUrl}/api/track`}
        directEndpoint={`${runningServer.baseUrl}/api/track`}
        autoPageViews={false}
      >
        <TrackOnMount eventName="page_view" props={{ session_id: 77 }} />
      </AnalyticsProvider>,
    );

    await waitFor(async () => {
      expect(await storage.getAll()).toHaveLength(1);
    });

    expect((secondaryServer as RunningStatusServer).getHits()).toBeGreaterThan(0);
    expect((await storage.getAll())[0]?.props.session_id).toBe(77);

    view.unmount();
  });

  it('rejects and does not store track with invalid schema', async () => {
    const storage = createMemoryAdapter();
    const server = createAnalyticsServer({
      storage,
      acceptedTracks: [
        {
          trackName: 'page_view',
          schema: z.object({ session_id: z.number() }),
          validateOn: 'props',
        },
      ],
      rejectUnknownTracks: true,
    });

    const handler = createFetchIngestHandler(server);
    runningServer = await startTestServer(handler);

    const view = render(
      <AnalyticsProvider
        appId="e2e-app"
        environment="production"
        transport="direct"
        directEndpoint={`${runningServer.baseUrl}/api/track`}
        autoPageViews={false}
      >
        <TrackOnMount eventName="page_view" props={{ session_id: 'invalid' }} />
      </AnalyticsProvider>,
    );

    await waitFor(async () => {
      expect(await storage.getAll()).toHaveLength(0);
    });

    view.unmount();
  });

  it('rejects unknown tracks when allowlist is enabled', async () => {
    const storage = createMemoryAdapter();
    const server = createAnalyticsServer({
      storage,
      acceptedTracks: [
        {
          trackName: 'page_view',
          schema: z.object({ session_id: z.number() }),
          validateOn: 'props',
        },
      ],
      rejectUnknownTracks: true,
    });

    const handler = createFetchIngestHandler(server);
    runningServer = await startTestServer(handler);

    const view = render(
      <AnalyticsProvider
        appId="e2e-app"
        environment="production"
        transport="direct"
        directEndpoint={`${runningServer.baseUrl}/api/track`}
        autoPageViews={false}
      >
        <TrackOnMount eventName="checkout_started" props={{ total: 100 }} />
      </AnalyticsProvider>,
    );

    await waitFor(async () => {
      expect(await storage.getAll()).toHaveLength(0);
    });

    view.unmount();
  });

  it('stores masked values when masking config is enabled', async () => {
    const storage = createMemoryAdapter();
    const server = createAnalyticsServer({
      storage,
      acceptedTracks: [
        {
          trackName: 'signup',
          schema: z.object({
            user: z.object({
              email: z.string(),
              password: z.string(),
            }),
          }),
          validateOn: 'props',
        },
      ],
      masking: {
        paths: ['user.email'],
        keyPatterns: [/password/i],
        maskValue: '[masked]',
      },
    });

    const handler = createFetchIngestHandler(server);
    runningServer = await startTestServer(handler);

    const view = render(
      <AnalyticsProvider
        appId="e2e-app"
        environment="production"
        transport="direct"
        directEndpoint={`${runningServer.baseUrl}/api/track`}
        autoPageViews={false}
      >
        <TrackOnMount
          eventName="signup"
          props={{
            user: {
              email: 'john@xray.dev',
              password: 'secret',
            },
          }}
        />
      </AnalyticsProvider>,
    );

    await waitFor(async () => {
      expect(await storage.getAll()).toHaveLength(1);
    });

    expect((await storage.getAll())[0]?.props.user).toEqual({
      email: '[masked]',
      password: '[masked]',
    });

    view.unmount();
  });

  it('blocks unknown tracks in strict catalog mode before ingest', async () => {
    const storage = createMemoryAdapter();
    const server = createAnalyticsServer({
      storage,
      acceptedTracks: [
        {
          trackName: 'page_view',
          schema: z.object({ session_id: z.number() }),
          validateOn: 'props',
          catalogSchema: {
            type: 'object',
            properties: {
              session_id: { type: 'number' },
            },
          },
        },
      ],
      rejectUnknownTracks: true,
    });

    const ingestHandler = createFetchIngestHandler(server);
    const catalogHandler = createFetchCatalogHandler(server);
    runningServer = await startTestServer(async (request) => {
      if (new URL(request.url).pathname === '/api/catalog') {
        return catalogHandler(request);
      }

      return ingestHandler(request);
    });

    const view = render(
      <AnalyticsProvider
        appId="e2e-app"
        environment="production"
        transport="direct"
        directEndpoint={`${runningServer.baseUrl}/api/track`}
        catalogEndpoint={`${runningServer.baseUrl}/api/catalog`}
        strictCatalog
        autoPageViews={false}
      >
        <TrackOnMount eventName="unknown_event" props={{ any: true }} />
      </AnalyticsProvider>,
    );

    await new Promise((resolve) => setTimeout(resolve, 120));
    await expect(storage.getAll()).resolves.toHaveLength(0);

    view.unmount();
  });

  it('does not send events in local environment', async () => {
    const storage = createMemoryAdapter();
    const server = createAnalyticsServer({
      storage,
      acceptedTracks: [
        {
          trackName: 'page_view',
          schema: z.object({ session_id: z.number() }),
          validateOn: 'props',
        },
      ],
    });

    const handler = createFetchIngestHandler(server);
    runningServer = await startTestServer(handler);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const view = render(
      <AnalyticsProvider
        appId="e2e-app"
        environment="local"
        transport="direct"
        directEndpoint={`${runningServer.baseUrl}/api/track`}
        autoPageViews={false}
      >
        <TrackOnMount eventName="page_view" props={{ session_id: 1 }} />
      </AnalyticsProvider>,
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        '[xray][track]',
        expect.objectContaining({ name: 'page_view', environment: 'local' }),
      );
    });

    expect(await storage.getAll()).toHaveLength(0);

    view.unmount();
    consoleSpy.mockRestore();
  });

  it('does not send events in dev environment', async () => {
    const storage = createMemoryAdapter();
    const server = createAnalyticsServer({
      storage,
      acceptedTracks: [
        {
          trackName: 'page_view',
          schema: z.object({ session_id: z.number() }),
          validateOn: 'props',
        },
      ],
    });

    const handler = createFetchIngestHandler(server);
    runningServer = await startTestServer(handler);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const view = render(
      <AnalyticsProvider
        appId="e2e-app"
        environment="dev"
        transport="direct"
        directEndpoint={`${runningServer.baseUrl}/api/track`}
        autoPageViews={false}
      >
        <TrackOnMount eventName="page_view" props={{ session_id: 1 }} />
      </AnalyticsProvider>,
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        '[xray][track]',
        expect.objectContaining({ name: 'page_view', environment: 'dev' }),
      );
    });

    expect(await storage.getAll()).toHaveLength(0);

    view.unmount();
    consoleSpy.mockRestore();
  });
});
