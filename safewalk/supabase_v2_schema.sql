-- ─── SafeWalk v2 Schema — Full clean migration ───────────────────────────────
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- This drops all v1 tables and rebuilds everything for v2.

-- ── Step 1: Drop v1 tables (order matters for foreign keys) ──────────────────
DROP TABLE IF EXISTS share_sessions       CASCADE;
DROP TABLE IF EXISTS location_snapshots   CASCADE;
DROP TABLE IF EXISTS escalation_events    CASCADE;
DROP TABLE IF EXISTS location_pings       CASCADE;
DROP TABLE IF EXISTS walk_sessions        CASCADE;
DROP TABLE IF EXISTS trusted_contacts     CASCADE;
DROP TABLE IF EXISTS contacts             CASCADE;
DROP TABLE IF EXISTS profiles             CASCADE;

-- Also drop any old trigger/function that may conflict
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- ── Step 2: profiles ──────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id                   UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name            TEXT NOT NULL DEFAULT '',
  phone                TEXT,
  avatar_initials      TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  preferences          JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  fname    TEXT;
  initials TEXT;
BEGIN
  fname    := NEW.raw_user_meta_data->>'full_name';
  initials := upper(
    left(split_part(COALESCE(fname,'SW'), ' ', 1), 1) ||
    left(split_part(COALESCE(fname,''),  ' ', 2), 1)
  );
  INSERT INTO profiles (id, full_name, avatar_initials)
  VALUES (NEW.id, COALESCE(fname, ''), COALESCE(NULLIF(initials,''), 'SW'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Step 3: trusted_contacts ──────────────────────────────────────────────────
CREATE TABLE trusted_contacts (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name  TEXT NOT NULL,
  phone      TEXT NOT NULL,
  email      TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE trusted_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts_all" ON trusted_contacts
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Step 4: walk_sessions ─────────────────────────────────────────────────────
CREATE TABLE walk_sessions (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status           TEXT DEFAULT 'active'
                     CHECK (status IN ('active','completed','sos_triggered','escalating')),
  destination      TEXT,
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  ended_at         TIMESTAMPTZ,
  duration_seconds INTEGER,
  distance_meters  NUMERIC,
  share_token      UUID DEFAULT gen_random_uuid() UNIQUE,
  share_expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

ALTER TABLE walk_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_owner" ON walk_sessions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_public_share" ON walk_sessions
  FOR SELECT USING (share_token IS NOT NULL AND share_expires_at > NOW());

-- ── Step 5: location_pings ────────────────────────────────────────────────────
CREATE TABLE location_pings (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  UUID REFERENCES walk_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lat         NUMERIC(10,7) NOT NULL,
  lng         NUMERIC(10,7) NOT NULL,
  accuracy    NUMERIC,
  bearing     NUMERIC,
  speed       NUMERIC,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX location_pings_session_time ON location_pings (session_id, recorded_at DESC);

ALTER TABLE location_pings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pings_owner" ON location_pings
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pings_public_share" ON location_pings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM walk_sessions ws
      WHERE ws.id = session_id AND ws.share_expires_at > NOW()
    )
  );

-- ── Step 6: escalation_events ─────────────────────────────────────────────────
CREATE TABLE escalation_events (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES walk_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stage      INTEGER NOT NULL CHECK (stage BETWEEN 1 AND 5),
  event_type TEXT NOT NULL,
  contact_id UUID REFERENCES trusted_contacts(id),
  resolved   BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE escalation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "escalations_owner" ON escalation_events
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Step 7: Realtime ──────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE location_pings;
ALTER PUBLICATION supabase_realtime ADD TABLE walk_sessions;

-- ── Step 8: GRANTs ────────────────────────────────────────────────────────────
GRANT SELECT                           ON public.walk_sessions     TO anon;
GRANT SELECT                           ON public.location_pings    TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE   ON public.profiles          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE   ON public.trusted_contacts  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE   ON public.walk_sessions     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE   ON public.location_pings    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE   ON public.escalation_events TO authenticated;
