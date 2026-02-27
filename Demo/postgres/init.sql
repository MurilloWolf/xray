create schema if not exists analytics;

create table if not exists analytics.events (
  id bigserial primary key,
  name text not null,
  ts bigint not null,
  app_id text not null,
  session_id text,
  url text,
  path text,
  ref text,
  environment text,
  props jsonb not null default '{}'::jsonb,
  tags text[],
  client_meta jsonb,
  write_key text,
  received_at bigint not null,
  meta jsonb
);

create index if not exists idx_analytics_events_ts on analytics.events (ts);
create index if not exists idx_analytics_events_app_name on analytics.events (app_id, name);
