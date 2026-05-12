-- TradeStack MCP persistent state schema
-- Apply with: psql $DATABASE_URL -f supabase/schema.sql
--
-- Most tables use UUID primary keys and have RLS enabled. Service-role key
-- bypasses RLS; the MCP server should always connect with service-role.
-- Per-user scoping is enforced in application code via user_id.
--
-- user_id is stored as text for compatibility with non-Supabase auth backends.
-- Cast / migrate to uuid if you bind to Supabase Auth.

create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────
-- Per-user settings (webhook tokens, future prefs)
-- ─────────────────────────────────────────────────────────────────────
create table if not exists user_settings (
  user_id        text primary key,
  webhook_token  text,
  webhook_rotated_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists user_settings_webhook_token_idx on user_settings(webhook_token);

-- ─────────────────────────────────────────────────────────────────────
-- Watchlists
-- ─────────────────────────────────────────────────────────────────────
create table if not exists watchlists (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null,
  name        text not null,
  symbols     text[] not null default '{}',
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists watchlists_user_idx on watchlists(user_id);

-- ─────────────────────────────────────────────────────────────────────
-- Saved screener queries
-- ─────────────────────────────────────────────────────────────────────
create table if not exists saved_scans (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null,
  name        text not null,
  market      text not null,
  filters     jsonb not null,
  columns     text[] not null,
  sort        jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, name)
);

-- ─────────────────────────────────────────────────────────────────────
-- Journal entries (post-trade analysis)
-- ─────────────────────────────────────────────────────────────────────
create table if not exists journal_entries (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null,
  symbol          text not null,
  side            text check (side in ('long', 'short')) not null,
  entry_price     numeric,
  exit_price      numeric,
  stop_price      numeric,
  qty             numeric,
  pnl             numeric,
  strategy        text,
  notes           text,
  tags            text[] not null default '{}',
  opened_at       timestamptz,
  closed_at       timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists journal_user_symbol_idx on journal_entries(user_id, symbol);
create index if not exists journal_user_closed_idx on journal_entries(user_id, closed_at desc);

-- ─────────────────────────────────────────────────────────────────────
-- Alert history (webhook ingress + composite alert outcomes)
-- ─────────────────────────────────────────────────────────────────────
create table if not exists alert_events (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null,
  source          text not null,        -- 'tradingview_webhook' | 'composite' | etc.
  symbol          text,
  payload         jsonb not null,
  received_at     timestamptz not null default now(),
  acted_on        boolean not null default false,
  outcome         text,                 -- 'win' | 'loss' | 'expired' | null
  outcome_pnl     numeric
);

create index if not exists alert_events_user_recv_idx on alert_events(user_id, received_at desc);

-- ─────────────────────────────────────────────────────────────────────
-- Composite alerts (multi-condition orchestration)
-- ─────────────────────────────────────────────────────────────────────
create table if not exists composite_alerts (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null,
  name            text not null,
  symbol          text not null,
  conditions      jsonb not null,       -- array of {field, op, value, source}
  logic           text check (logic in ('all', 'any')) default 'all',
  status          text check (status in ('active', 'paused', 'fired', 'expired')) default 'active',
  expires_at      timestamptz,
  created_at      timestamptz not null default now(),
  unique (user_id, name)
);

-- ─────────────────────────────────────────────────────────────────────
-- Strategy lifecycle (replay → paper → live promotion log)
-- ─────────────────────────────────────────────────────────────────────
create table if not exists strategy_runs (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null,
  strategy_name   text not null,
  stage           text check (stage in ('replay', 'paper', 'live')) not null,
  pine_source     text,
  config          jsonb,
  metrics         jsonb,                -- {sharpe, calmar, max_dd, profit_factor, win_rate, n_trades}
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  promoted        boolean not null default false
);

create index if not exists strategy_runs_user_strat_idx on strategy_runs(user_id, strategy_name);

-- ─────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────
alter table watchlists      enable row level security;
alter table saved_scans     enable row level security;
alter table journal_entries enable row level security;
alter table alert_events    enable row level security;
alter table composite_alerts enable row level security;
alter table strategy_runs   enable row level security;
