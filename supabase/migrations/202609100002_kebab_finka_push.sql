-- Kebab Finka PWA push notifications
-- Stores browser push subscriptions and a daily alert dedupe ledger.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kebab_stock_alert_runs (
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_date date not null,
  ingredient_snapshot jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, alert_date)
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions(user_id, created_at desc);

alter table public.push_subscriptions enable row level security;
alter table public.kebab_stock_alert_runs enable row level security;

-- Subscription data contains private browser endpoints and encryption keys.
-- It is only managed by authenticated server routes through service_role.
revoke all on table public.push_subscriptions from public, anon, authenticated;
revoke all on table public.kebab_stock_alert_runs from public, anon, authenticated;
grant select, insert, update, delete on table public.push_subscriptions to service_role;
grant select, insert, update, delete on table public.kebab_stock_alert_runs to service_role;

-- Keep updated_at current without relying on application code.
drop trigger if exists set_updated_at on public.push_subscriptions;
create trigger set_updated_at
before update on public.push_subscriptions
for each row execute function private.set_updated_at();
