-- Store planned route geometry for public trusted-contact tracking links.
-- Run in Supabase SQL Editor.

alter table public.walk_sessions
  add column if not exists route_coords jsonb,
  add column if not exists destination_coords jsonb;
