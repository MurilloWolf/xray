# XRay Demo (Backend + Frontend)

Um playground real para testar o ecossistema de analytics do XRay em ponta a ponta:

- frontend React consumindo `@xray/analytics-react`
- backend Express consumindo `analytics-server`
- persistência em Postgres
- catálogo de eventos com validação de schema

---

## Artigo sincero: o que este projeto é (e o que não é)

### O que ele é

Este demo resolve um problema comum: **instrumentar eventos no frontend sem perder governança no backend**.

Na prática, ele prova quatro pontos importantes:

1. você consegue disparar eventos rápido no app cliente;
2. o backend mantém a regra de negócio com catálogo e schema;
3. os dados ficam persistidos e consultáveis;
4. o time consegue depurar o fluxo completo sem depender de ferramentas externas.

### O que ele não é

Sendo direto: este projeto **não** é uma plataforma final de analytics com dashboards avançados, RBAC, pipelines de dados, alertas, agregações ou escalabilidade enterprise pronta. Ele é um **demo técnico bem montado** para validar arquitetura, integração e contrato de eventos.

### Por que isso importa

Muitas implementações de tracking falham porque começam só no frontend, sem contrato claro de dados. Aqui a proposta é o contrário: o frontend tem ergonomia, mas o backend continua como fonte de verdade.

---

## Ideia central da lib/projeto

O projeto junta duas peças:

- `analytics-react`: experiência de instrumentação no cliente (`track`, hooks prontos, provider, metadata);
- `analytics-server`: ingestão, catálogo, validação e armazenamento.

O contrato de eventos vive no backend (`acceptedTracks`). O frontend pode operar em modo estrito (`strictCatalog`) e só enviar o que está publicado em `GET /api/catalog`.

---

## Arquitetura

```text
[React App]
  AnalyticsProvider
     | POST /api/track
     v
[Express API]
  createIngestHandler + createCatalogHandler
     | validação (zod + catálogo)
     v
[Postgres]
  analytics.events
```

### Componentes principais

- **Frontend**
  - `frontend/src/App.tsx`
  - Provider configurado com `directEndpoint`, `catalogEndpoint`, `strictCatalog`, `metadata`
  - Playground para disparar eventos e inspecionar payload

- **Backend**
  - `backend/src/server.ts`
  - `createAnalyticsServer(...)` com catálogo e schemas
  - `createPostgresAdapter(...)` para persistência
  - endpoints de saúde, catálogo, ingestão, listagem e limpeza

- **Banco**
  - `postgres/init.sql`
  - schema `analytics`, tabela `events`, índices por `ts` e `(app_id, name)`

---

## Estrutura da pasta

```txt
Demo/
  backend/
  frontend/
  postgres/
  docker-compose.yml
  README.md
```

---

## Pré-requisitos

- Docker + Docker Compose
- Node.js 20+
- npm

---

## Como rodar (rápido)

### 1) Subir Postgres + backend

Na raiz `Demo`:

```bash
docker compose up --build
```

Isso sobe:

- Postgres em `localhost:5432`
- Backend em `localhost:4000`
- Inicialização do banco via `postgres/init.sql`

### 2) Conferir saúde da API

```bash
curl http://localhost:4000/api/health
```

Resposta esperada:

```json
{ "ok": true }
```

### 3) Subir frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Abra: `http://localhost:5173`

---

## Como usar o playground

1. dispare eventos no painel esquerdo (`click_button`, `click_link`, `page_view`, `scroll`, `element_view`);
2. crie evento manual no **Custom Track Builder**;
3. clique em **Buscar tracks** para carregar dados do backend;
4. abra **Detalhes** para inspecionar o JSON completo;
5. use **Limpar tracks** para deletar (com ou sem filtro de intervalo).

---

## Endpoints da API

- `GET /api/health`
- `POST /api/track`
- `GET /api/catalog`
- `GET /api/tracks?dateInit=&dateEnd=`
- `DELETE /api/tracks?dateInit=&dateEnd=`

### Exemplos com `curl`

```bash
# catálogo publicado pelo backend
curl http://localhost:4000/api/catalog

# listar tracks
curl "http://localhost:4000/api/tracks"

# listar por intervalo (epoch em ms)
curl "http://localhost:4000/api/tracks?dateInit=1730000000000&dateEnd=1739999999999"

# limpar por intervalo
curl -X DELETE "http://localhost:4000/api/tracks?dateInit=1730000000000&dateEnd=1739999999999"
```

---

## Exemplo de implementação: frontend (lib `analytics-react`)

Exemplo mínimo equivalente ao demo:

```tsx
import { AnalyticsProvider, useAnalytics } from '@xray/analytics-react';

function Page() {
  const { trackClickButton } = useAnalytics();

  return (
    <button
      onClick={() => trackClickButton({ id: 'buy-now', source: 'landing-hero' }, ['button', 'cta'])}
    >
      Comprar
    </button>
  );
}

export function App() {
  return (
    <AnalyticsProvider
      appId="demo-web"
      environment="production"
      transport="direct"
      directEndpoint="http://localhost:4000/api/track"
      catalogEndpoint="http://localhost:4000/api/catalog"
      strictCatalog
      metadata
      preferSendBeacon={false}
      autoPageViews={false}
      debug
    >
      <Page />
    </AnalyticsProvider>
  );
}
```

### Observações dessa configuração

- `strictCatalog`: impede envio de eventos fora do catálogo
- `metadata`: inclui `clientMeta` (dispositivo, OS, user agent etc.)
- `preferSendBeacon={false}`: usa `fetch` para facilitar debug/confirmar resposta HTTP

---

## Exemplo de implementação: backend (lib `analytics-server`)

Versão simplificada do que existe em `backend/src/server.ts`:

```ts
import express from 'express';
import { Pool } from 'pg';
import { z } from 'zod';
import {
  createAnalyticsServer,
  createCatalogHandler,
  createIngestHandler,
  createPostgresAdapter,
} from '.../analytics-server';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const storage = createPostgresAdapter({
  db: pool,
  schemaName: 'analytics',
  tableName: 'events',
});

const analyticsServer = createAnalyticsServer({
  storage,
  rejectUnknownTracks: true,
  acceptedTracks: [
    {
      trackName: 'click_button',
      schema: z.object({ id: z.string() }).passthrough(),
      validateOn: 'props',
      version: 1,
      description: 'Clique em botão',
      tags: ['ui'],
      catalogSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  ],
});

const app = express();
app.use(express.json());

app.post('/api/track', createIngestHandler(analyticsServer, { adapter: 'express' }));
app.get('/api/catalog', createCatalogHandler(analyticsServer, { adapter: 'express' }));
```

### Decisão de design importante

No demo, o backend valida em duas camadas:

- schema runtime com `zod`
- contrato público via `catalogSchema` no endpoint de catálogo

Isso reduz divergência entre “o que o cliente acha que pode mandar” e “o que o servidor aceita”.

---

## Catálogo atual de eventos do demo

- `click_button`
- `click_link`
- `page_view`
- `scroll`
- `element_view`
- `custom_demo_event`

Todos definidos em `backend/src/server.ts` com `rejectUnknownTracks: true`.

---

## Banco de dados

Tabela principal: `analytics.events`

Campos relevantes:

- `name`, `ts`, `app_id`, `session_id`
- `props` (`jsonb`)
- `tags` (`text[]`)
- `client_meta` (`jsonb`)
- `received_at`, `meta`

Script de criação: `postgres/init.sql`.

---

## Variáveis e configuração

### Backend (`docker-compose.yml`)

- `PORT=4000`
- `DATABASE_URL=postgresql://xray:xray@postgres:5432/xray`
- `CORS_ORIGIN=http://localhost:5173`
- `ANALYTICS_SCHEMA=analytics`
- `ANALYTICS_TABLE=events`

### Frontend

- `VITE_API_URL` (opcional)
  - padrão no código: `http://localhost:4000`

---

## Troubleshooting

- Porta `5432` ocupada: altere mapeamento do Postgres em `docker-compose.yml`.
- Porta `4000` ocupada: altere `PORT` no backend.
- Front sem conexão: confira `VITE_API_URL` e `CORS_ORIGIN`.
- Tabela não criada: valide logs do container `postgres` e `postgres/init.sql`.
- Erro de schema antigo no banco: rode `docker compose down -v` e suba novamente.

---

## Encerrando ambiente

```bash
docker compose down
```

Para remover também os dados do Postgres:

```bash
docker compose down -v
```

---

## Próximos passos recomendados (realistas)

1. versionar catálogo de eventos por domínio de negócio;
2. adicionar autenticação de ingestão (`writeKey`/token);
3. criar testes de contrato para `acceptedTracks`;
4. incluir rate limit e proteção contra payload inválido massivo;
5. exportar eventos para pipeline analítico (warehouse/stream).
