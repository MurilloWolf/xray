# Xray

Biblioteca de tracking em monorepo com três pacotes:

- `@xray/analytics-cli`: CLI para bootstrap de endpoint de tracking em projetos Next.js
- `@xray/analytics-react`: SDK React para envio de eventos com API explícita
- `@xray/analytics-server`: SDK backend embutível para validar, mascarar e persistir tracks

## Objetivo do projeto

A ideia do Xray é facilitar instrumentação de analytics em aplicações React/Next com:

- API de tracking explícita (sem listener automático de click)
- Envio via BFF (`/api/track`) ou direto para endpoint de ingest
- Comportamento por ambiente (`local`, `dev`, `production`)
- Setup rápido de infraestrutura com CLI

## Estrutura

```txt
packages/
  analytics-cli/    # CLI para iniciar integração no app Next
  analytics-react/  # SDK React para track de eventos
  analytics-server/ # SDK backend (ingestão, validação e masking)
```

## Requisitos

- Node.js 20+
- npm

## Scripts do monorepo

Na raiz:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

---

## `@xray/analytics-cli`

CLI para preparar o endpoint de tracking no Next.js e configurar variáveis de ambiente.

### O que ele faz

Comando:

```bash
npx xray-analytics init
```

A CLI:

1. Detecta se o projeto usa `app/` (App Router) ou `pages/` (Pages Router)
2. Cria rota de tracking se não existir:
   - `app/api/track/route.ts` **ou**
   - `pages/api/track.ts`
3. Cria/atualiza `.env.local` com:
   - `ANALYTICS_INGEST_URL`
   - `ANALYTICS_INGEST_KEY`

### Exemplo de uso

```bash
cd meu-projeto-next
npx xray-analytics init
```

Depois disso, o app já fica pronto para receber eventos via `transport="bff"` no React SDK.

---

## `@xray/analytics-react`

SDK React para instrumentar eventos com controle explícito.

### Conceitos principais

- `AnalyticsProvider`: configura app, transporte e ambiente
- `useAnalytics`: hook principal para envio de eventos
- `TrackPageView` / `useTrackPageView`: helpers para page view

### Ambientes

- `production`: envia de fato para rede
- `dev` e `local`: faz log no console (não envia)

### Modos de transporte

- `bff`: envia para `bffEndpoint` (default: `/api/track`)
- `direct`: envia para `directEndpoint`
- `auto`: tenta BFF e faz fallback para direct

## Exemplo básico (Provider + hooks)

```tsx
import { AnalyticsProvider, useAnalytics } from '@xray/analytics-react';

function BuyButton() {
  const { trackClickButton } = useAnalytics();

  return (
    <button
      onClick={() =>
        trackClickButton({
          id: 'buy-now',
          productId: 'sku_123',
          price: 129.9,
        })
      }
    >
      Comprar
    </button>
  );
}

export function App() {
  return (
    <AnalyticsProvider
      appId="web-store"
      environment={process.env.NODE_ENV}
      transport="bff"
      bffEndpoint="/api/track"
    >
      <BuyButton />
    </AnalyticsProvider>
  );
}
```

## Exemplo com evento customizado

```tsx
import { useAnalytics } from '@xray/analytics-react';

function Checkout() {
  const { track } = useAnalytics();

  function onStartCheckout() {
    track('checkout_started', {
      cartId: 'cart_001',
      items: 3,
      total: 259.7,
      coupon: 'WELCOME10',
    });
  }

  return <button onClick={onStartCheckout}>Finalizar compra</button>;
}
```

## Exemplo de Page View explícita

```tsx
import { TrackPageView } from '@xray/analytics-react';

export function PricingPage() {
  return (
    <>
      <TrackPageView props={{ page: 'pricing', plan: 'pro' }} />
      <h1>Pricing</h1>
    </>
  );
}
```

---

## `@xray/analytics-server`

SDK de backend embutível para processar eventos antes de salvar no banco.

### O que ele resolve

- valida payload base de tracks
- valida por lista de tracks aceitos + schema (com `zod`)
- permite rejeitar tracks desconhecidos
- mascara campos sensíveis antes de persistir
- funciona com qualquer banco via adapter de storage

### Exemplo: validação de tracks + masking

```ts
import { z } from 'zod';
import { createAnalyticsServer, createMemoryAdapter } from '@xray/analytics-server';

const storage = createMemoryAdapter();

const server = createAnalyticsServer({
  storage,
  acceptedTracks: [
    {
      trackName: 'page_view',
      schema: z.object({ session_id: z.number() }),
      validateOn: 'props',
    },
    {
      trackName: 'checkout_started',
      schema: z.object({ total: z.number(), currency: z.string() }),
      validateOn: 'props',
    },
  ],
  rejectUnknownTracks: true,
  masking: {
    paths: ['user.email', 'card.number'],
    keyPatterns: [/password/i, /token/i],
    maskValue: '[masked]',
  },
});

const result = await server.ingest({
  name: 'page_view',
  appId: 'web-store',
  props: { session_id: 123 },
});

if (!result.ok) {
  console.error(result.error.code, result.error.message);
}
```

### Exemplo: handler HTTP estilo `Request`/`Response`

```ts
import { createFetchIngestHandler } from '@xray/analytics-server';

const handler = createFetchIngestHandler(server);

export async function POST(request: Request) {
  return handler(request);
}
```

### Exemplo: Express adapter

```ts
import express from 'express';
import { createExpressIngestHandler } from '@xray/analytics-server';

const app = express();
app.use(express.json());

const expressHandler = createExpressIngestHandler(server);

app.post('/api/track', (req, res) => {
  void expressHandler(req, res);
});
```

### Exemplo: escolher adapter por configuração

```ts
import { createIngestHandler } from '@xray/analytics-server';

const fetchHandler = createIngestHandler(server, { adapter: 'fetch' });
const expressHandler = createIngestHandler(server, {
  adapter: 'express',
  express: {
    getContext: (req) => ({ requestId: req.headers?.['x-request-id'] as string | undefined }),
  },
});
```

### Adapter para banco (Postgres, Mongo, SQLite, etc.)

Você implementa apenas a interface de storage:

```ts
import type { AnalyticsStorageAdapter, StoredAnalyticsEvent } from '@xray/analytics-server';

const storage: AnalyticsStorageAdapter = {
  async save(event: StoredAnalyticsEvent) {
    // salvar no banco de sua escolha
  },
  async getAll(dateInit?: number, dateEnd?: number) {
    // retornar eventos filtrando por ts quando necessário
    return [];
  },
  async clear(dateInit?: number, dateEnd?: number) {
    // limpar eventos no intervalo e retornar quantidade removida
    return 0;
  },
};

// Postgres (node-postgres / pg)
import { Pool } from 'pg';
import { createPostgresAdapter } from '@xray/analytics-server';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const postgresStorage = createPostgresAdapter({
  db: pool,
  schemaName: 'analytics',
  tableName: 'events',
});

// Exemplo de tabela:
// create schema if not exists analytics;
// create table if not exists analytics.events (
//   id bigserial primary key,
//   name text not null,
//   ts bigint not null,
//   app_id text not null,
//   session_id text,
//   url text,
//   path text,
//   ref text,
//   environment text,
//   props jsonb not null default '{}'::jsonb,
//   tags text[],
//   client_meta jsonb,
//   write_key text,
//   received_at bigint not null,
//   meta jsonb
// );
```

---

## Fluxo recomendado de adoção

1. Rodar CLI no projeto Next (`npx xray-analytics init`)
2. Envolver aplicação com `AnalyticsProvider`
3. Instrumentar eventos críticos com `track`/helpers
4. Em produção, configurar `ANALYTICS_INGEST_URL` e `ANALYTICS_INGEST_KEY` reais
5. Validar eventos no backend de ingest

## Desenvolvimento local

No monorepo:

```bash
npm install
npm run lint
npm run test
npm run build
```

## Status

- Arquitetura modular por domínio (`core`, `hooks`, `runtime`, `shared`)
- Testes organizados por pacote em `tests/`
- Build e testes passando no workspace
