-- ─── SafeWalk – Supabase SQL Schema ──────────────────────────────────────────
-- Paste this entire file into Supabase → SQL Editor → New query → Run

-- ── Tables ────────────────────────────────────────────────────────────────────

create table public.contacts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  name       text not null,
  phone      text not null,
  email      text not null,
  is_primary boolean not null default false,
  created_at timestamptz default now() not null
);

create table public.walk_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  started_at timestamptz default now() not null,
  ended_at   timestamptz,
  destination text,
  status     text not null default 'active'
               check (status in ('active', 'completed', 'escalated')),
  created_at timestamptz default now() not null
);

create table public.location_snapshots (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references public.walk_sessions(id) on delete cascade not null,
  lat         double precision not null,
  lng         double precision not null,
  bearing     double precision,
  speed       double precision,
  recorded_at timestamptz default now() not null
);

create table public.share_sessions (
  id              text primary key,
  walk_session_id uuid references public.walk_sessions(id) on delete cascade,
  user_name       text not null default 'SafeWalk User',
  user_phone      text,
  last_lat        double precision,
  last_lng        double precision,
  last_bearing    double precision,
  last_speed      double precision,
  last_updated_at timestamptz,
  expires_at      timestamptz not null,
  created_at      timestamptz default now() not null
);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.contacts          enable row level security;
alter table public.walk_sessions     enable row level security;
alter table public.location_snapshots enable row level security;
alter table public.share_sessions    enable row level security;

-- contacts: users can only read/write their own rows
create policy "contacts_own" on public.contacts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- walk_sessions: users can only read/write their own rows
create policy "walk_sessions_own" on public.walk_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- location_snapshots: accessible only through sessions the user owns
create policy "location_snapshots_own" on public.location_snapshots
  for all
  using (
    exists (
      select 1 from public.walk_sessions ws
      where ws.id = session_id and ws.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.walk_sessions ws
      where ws.id = session_id and ws.user_id = auth.uid()
    )
  );

-- share_sessions: anyone can read (public tracking link), only owners can write
create policy "share_sessions_read_public" on public.share_sessions
  for select using (true);

create policy "share_sessions_insert" on public.share_sessions
  for insert with check (
    exists (
      select 1 from public.walk_sessions ws
      where ws.id = walk_session_id and ws.user_id = auth.uid()
    )
  );

create policy "share_sessions_update" on public.share_sessions
  for update using (
    exists (
      select 1 from public.walk_sessions ws
      where ws.id = walk_session_id and ws.user_id = auth.uid()
    )
  );

-- ── Realtime ──────────────────────────────────────────────────────────────────
-- Enables live location push to the SharePage via Supabase Realtime
alter publication supabase_realtime add table public.share_sessions;
