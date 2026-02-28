import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  ChevronRight,
  Clock3,
  Eye,
  Link2,
  MousePointerClick,
  RefreshCcw,
  ScrollText,
  Smartphone,
} from 'lucide-react';

import { AnalyticsProvider, useAnalytics } from '@xray-analytics/analytics-react';

import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Dialog } from './components/ui/dialog';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './components/ui/pagination';
import { Textarea } from './components/ui/textarea';

type DemoTrack = {
  name: string;
  ts: number;
  appId: string;
  sessionId?: string;
  url?: string;
  path?: string;
  ref?: string;
  environment?: string;
  props?: Record<string, unknown>;
  tags?: string[];
  clientMeta?: {
    ip?: string;
    userAgent?: string;
    isMobile?: boolean;
    os?: string;
    platform?: string;
    language?: string;
    screen?: {
      width: number;
      height: number;
    };
  };
  writeKey?: string;
  receivedAt: number;
  meta?: {
    ip?: string;
    userAgent?: string;
    requestId?: string;
  };
};

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const pageSize = 8;

function toEpochMs(value: string): string {
  if (!value) return '';
  const epoch = new Date(value).getTime();
  if (!Number.isFinite(epoch)) return '';
  return String(epoch);
}

function queryString(dateInit: string, dateEnd: string) {
  const params = new URLSearchParams();
  const dateInitEpoch = toEpochMs(dateInit);
  const dateEndEpoch = toEpochMs(dateEnd);

  if (dateInitEpoch) params.set('dateInit', dateInitEpoch);
  if (dateEndEpoch) params.set('dateEnd', dateEndEpoch);

  const value = params.toString();
  return value ? `?${value}` : '';
}

function formatTimestamp(ts: number) {
  return new Date(ts).toLocaleString();
}

function parseJsonProps(value: string) {
  if (!value.trim()) return {};
  const parsed = JSON.parse(value) as unknown;
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('props precisa ser um objeto JSON válido');
  }
  return parsed as Record<string, unknown>;
}

function buildPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) return [1, 2, 3, 4, -1, totalPages];
  if (currentPage >= totalPages - 2)
    return [1, -1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];

  return [1, -1, currentPage - 1, currentPage, currentPage + 1, -1, totalPages];
}

function PlaygroundPanel({ onTrackSent }: { onTrackSent: () => Promise<void> }) {
  const { track, trackClickButton, trackClickLink, trackPageView, trackScroll, trackElementView } =
    useAnalytics();

  const [productId, setProductId] = useState('buy-now');
  const [scrollDepth, setScrollDepth] = useState(65);
  const [customName, setCustomName] = useState('custom_demo_event');
  const [customTags, setCustomTags] = useState('custom,demo');
  const [customProps, setCustomProps] = useState(
    '{\n  "source": "playground",\n  "campaign": "q1"\n}',
  );
  const [feedback, setFeedback] = useState('');

  const sendAndRefresh = (cb: () => void, message: string) => {
    cb();
    setFeedback(message);
    void onTrackSent();
  };

  const sendCustomTrack = () => {
    try {
      const props = parseJsonProps(customProps);
      const tags = customTags
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      sendAndRefresh(() => track(customName, props, tags), `Track \"${customName}\" enviado.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Erro ao montar track customizado.');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <MousePointerClick className="h-5 w-5" />
            Playground de Tracks
          </CardTitle>
          <CardDescription>
            Dispare eventos com elementos visuais e cenários mais próximos do uso real.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              className="justify-start"
              onClick={() =>
                sendAndRefresh(
                  () =>
                    trackClickButton({ id: productId, source: 'playground-cta' }, [
                      'button',
                      'cta',
                    ]),
                  'Evento click_button enviado.',
                )
              }
            >
              <MousePointerClick className="h-4 w-4" />
              Click em botão CTA
            </Button>
            <Button
              variant="secondary"
              className="justify-start"
              onClick={() =>
                sendAndRefresh(
                  () => trackClickLink({ id: 'docs-link', href: '/docs' }, ['link', 'navigation']),
                  'Evento click_link enviado.',
                )
              }
            >
              <Link2 className="h-4 w-4" />
              Click em link docs
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() =>
                sendAndRefresh(
                  () =>
                    trackPageView({ page: 'dashboard-demo', source: 'playground' }, [
                      'page',
                      'view',
                    ]),
                  'Evento page_view enviado.',
                )
              }
            >
              <BarChart3 className="h-4 w-4" />
              Simular page_view
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onMouseEnter={() =>
                sendAndRefresh(
                  () =>
                    trackElementView({ id: 'pricing-card', visible: true, trigger: 'hover' }, [
                      'hover',
                    ]),
                  'Evento element_view enviado no hover.',
                )
              }
            >
              <Eye className="h-4 w-4" />
              Passe o mouse neste botão
            </Button>
          </div>

          <div className="rounded-md border p-4">
            <div className="mb-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="productId">ID do produto</Label>
                <Input
                  id="productId"
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                  placeholder="buy-now"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scrollDepth">Profundidade de scroll ({scrollDepth}%)</Label>
                <Input
                  id="scrollDepth"
                  type="range"
                  min={0}
                  max={100}
                  value={scrollDepth}
                  onChange={(event) => setScrollDepth(Number(event.target.value))}
                />
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                sendAndRefresh(
                  () => trackScroll({ depth: scrollDepth, page: 'dashboard-demo' }, ['scroll']),
                  `Evento scroll enviado com profundidade ${scrollDepth}%.`,
                )
              }
            >
              <ScrollText className="h-4 w-4" />
              Enviar scroll com os controles acima
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Track Builder</CardTitle>
          <CardDescription>Monte o payload manualmente para testes de contrato.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customName">Nome do evento</Label>
              <Input
                id="customName"
                value={customName}
                onChange={(event) => setCustomName(event.target.value)}
                placeholder="custom_demo_event"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customTags">Tags (vírgula)</Label>
              <Input
                id="customTags"
                value={customTags}
                onChange={(event) => setCustomTags(event.target.value)}
                placeholder="marketing,campaign"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customProps">Props (JSON)</Label>
            <Textarea
              id="customProps"
              className="min-h-36 font-mono"
              value={customProps}
              onChange={(event) => setCustomProps(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={sendCustomTrack}>Enviar track customizado</Button>
            <Badge variant="outline">strictCatalog ativo</Badge>
          </div>

          {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function App() {
  const [tracks, setTracks] = useState<DemoTrack[]>([]);
  const [dateInit, setDateInit] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTrack, setSelectedTrack] = useState<DemoTrack | null>(null);

  const refreshTracks = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoading(true);
      setMessage('');
    }

    try {
      const response = await fetch(`${apiUrl}/api/tracks${queryString(dateInit, dateEnd)}`, {
        cache: 'no-store',
      });
      const payload = (await response.json()) as {
        ok: boolean;
        data?: DemoTrack[];
        count?: number;
      };

      if (!payload.ok || !payload.data) {
        setMessage('Falha ao carregar tracks');
        return;
      }

      setTracks(payload.data);
      if (!silent) setMessage(`Total de tracks: ${payload.count ?? payload.data.length}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro desconhecido ao buscar tracks');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const refreshAfterTrack = async () => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await refreshTracks({ silent: true });
  };

  const clearTracks = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${apiUrl}/api/tracks${queryString(dateInit, dateEnd)}`, {
        method: 'DELETE',
        cache: 'no-store',
      });
      const payload = (await response.json()) as { ok: boolean; removed?: number };

      if (!payload.ok) {
        setMessage('Falha ao limpar tracks');
        return;
      }

      setMessage(`Removidos: ${payload.removed ?? 0}`);
      await refreshTracks({ silent: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro desconhecido ao limpar tracks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshTracks();
  }, []);

  const totalPages = Math.max(1, Math.ceil(tracks.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const pageTracks = useMemo(() => {
    const start = (page - 1) * pageSize;
    return tracks.slice(start, start + pageSize);
  }, [tracks, page]);

  const dashboard = useMemo(() => {
    const osCounts: Record<string, number> = {
      ios: 0,
      android: 0,
      windows: 0,
      macos: 0,
      linux: 0,
      unknown: 0,
    };
    let mobile = 0;
    let web = 0;

    for (const item of tracks) {
      const os = String(item.clientMeta?.os ?? 'unknown').toLowerCase();
      osCounts[os] = (osCounts[os] ?? 0) + 1;

      if (item.clientMeta?.isMobile) mobile += 1;
      else web += 1;
    }

    return {
      total: tracks.length,
      mobile,
      web,
      ios: osCounts.ios ?? 0,
      android: osCounts.android ?? 0,
      windows: osCounts.windows ?? 0,
      macos: osCounts.macos ?? 0,
      linux: osCounts.linux ?? 0,
    };
  }, [tracks]);

  const paginationItems = useMemo(() => buildPaginationItems(page, totalPages), [page, totalPages]);

  return (
    <AnalyticsProvider
      appId="demo-web"
      environment="production"
      transport="direct"
      directEndpoint={`${apiUrl}/api/track`}
      preferSendBeacon={false}
      metadata
      catalogEndpoint={`${apiUrl}/api/catalog`}
      strictCatalog
      autoPageViews={false}
      debug
    >
      <main className="min-h-screen bg-background text-foreground">
        <div className="container py-8">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">XRay Analytics Playground</h1>
              <p className="text-sm text-muted-foreground">
                Demo com shadcn + Tailwind para simular e inspecionar eventos em tempo real.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge>direct transport</Badge>
              <Badge variant="secondary">catalog strict</Badge>
              <Badge variant="outline">metadata enabled</Badge>
            </div>
          </header>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
            <PlaygroundPanel onTrackSent={refreshAfterTrack} />

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Dashboard de métricas
                  </CardTitle>
                  <CardDescription>
                    Visão rápida por plataforma e sistema operacional dos tracks carregados.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Total de tracks</p>
                    <p className="text-2xl font-bold">{dashboard.total}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Mobile</p>
                    <p className="text-2xl font-bold">{dashboard.mobile}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Web/Desktop</p>
                    <p className="text-2xl font-bold">{dashboard.web}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">iOS</p>
                    <p className="text-2xl font-bold">{dashboard.ios}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Android</p>
                    <p className="text-2xl font-bold">{dashboard.android}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Windows/macOS/Linux</p>
                    <p className="text-2xl font-bold">
                      {dashboard.windows + dashboard.macos + dashboard.linux}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tracks (paginado)</CardTitle>
                  <CardDescription>
                    Clique em uma linha para abrir a modal com o payload completo do evento.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dateInit">dateInit</Label>
                      <Input
                        id="dateInit"
                        type="datetime-local"
                        value={dateInit}
                        onChange={(event) => setDateInit(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateEnd">dateEnd</Label>
                      <Input
                        id="dateEnd"
                        type="datetime-local"
                        value={dateEnd}
                        onChange={(event) => setDateEnd(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={() => void refreshTracks()} disabled={loading}>
                      <RefreshCcw className="h-4 w-4" />
                      Buscar tracks
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => void clearTracks()}
                      disabled={loading}
                    >
                      Limpar tracks
                    </Button>
                    {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
                  </div>

                  <div className="overflow-hidden rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60 text-left">
                        <tr>
                          <th className="px-3 py-2">Evento</th>
                          <th className="px-3 py-2">Horário</th>
                          <th className="px-3 py-2">Plataforma</th>
                          <th className="px-3 py-2">OS</th>
                          <th className="px-3 py-2">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageTracks.map((item, index) => (
                          <tr key={`${item.name}-${item.ts}-${index}`} className="border-t">
                            <td className="px-3 py-2 font-medium">{item.name}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {formatTimestamp(item.ts)}
                            </td>
                            <td className="px-3 py-2">{item.clientMeta?.platform ?? 'web'}</td>
                            <td className="px-3 py-2">{item.clientMeta?.os ?? 'unknown'}</td>
                            <td className="px-3 py-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedTrack(item)}
                              >
                                Detalhes
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {pageTracks.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                              Nenhum track encontrado para o filtro atual.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>

                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage((current) => Math.max(1, current - 1))}
                          disabled={page <= 1}
                        />
                      </PaginationItem>
                      {paginationItems.map((item, index) => (
                        <PaginationItem key={`${item}-${index}`}>
                          {item === -1 ? (
                            <PaginationEllipsis />
                          ) : (
                            <PaginationLink isActive={item === page} onClick={() => setPage(item)}>
                              {item}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                          disabled={page >= totalPages}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <Dialog
          open={selectedTrack !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedTrack(null);
          }}
          title={selectedTrack?.name ?? 'Detalhes do track'}
          description={
            selectedTrack
              ? `Recebido em ${formatTimestamp(selectedTrack.receivedAt)} · ${formatTimestamp(selectedTrack.ts)}`
              : undefined
          }
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">app: {selectedTrack?.appId}</Badge>
              <Badge variant="outline">session: {selectedTrack?.sessionId ?? 'n/a'}</Badge>
              <Badge variant="outline" className="gap-1">
                <Clock3 className="h-3 w-3" />
                {selectedTrack ? formatTimestamp(selectedTrack.ts) : '-'}
              </Badge>
            </div>
            <pre className="overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">
              {selectedTrack ? JSON.stringify(selectedTrack, null, 2) : ''}
            </pre>
          </div>
        </Dialog>
      </main>
    </AnalyticsProvider>
  );
}
