-- ─── Fix "Database error saving the user" ────────────────────────────────────
-- The INSERT policy on profiles blocks the trigger because auth.uid() is NULL
-- at sign-up time. Drop it — the trigger is the only thing that inserts profiles.

DROP POLICY IF EXISTS "profiles_insert" ON profiles;

-- Recreate the trigger function with ON CONFLICT safety and clean initials logic
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  fname    TEXT;
  part1    TEXT;
  part2    TEXT;
  initials TEXT;
BEGIN
  fname  := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  part1  := upper(left(split_part(fname, ' ', 1), 1));
  part2  := upper(left(split_part(fname, ' ', 2), 1));
  initials := CASE WHEN part1 = '' THEN 'SW' ELSE part1 || part2 END;

  INSERT INTO public.profiles (id, full_name, avatar_initials)
  VALUES (NEW.id, fname, initials)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure the trigger exists (safe to re-run)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Verify the fix by checking current policies on profiles
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';
