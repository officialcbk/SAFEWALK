-- Adds the per-contact permission tier the Trayl rebrand's Contacts screen
-- needs. Run this once in the Supabase SQL editor against the live project.
--
-- Tiers (see README.md "Contacts" section):
--   full        — primary contact: called first on SOS, gets the live route
--   live_route  — gets the live route + check-in alerts, not called on SOS
--   alerts_only — gets check-in/SOS alerts only, never the live route

ALTER TABLE trusted_contacts
  ADD COLUMN IF NOT EXISTS permission_level TEXT NOT NULL DEFAULT 'live_route'
    CHECK (permission_level IN ('full', 'live_route', 'alerts_only'));

-- Existing primary contacts (there's normally at most one) become 'full' —
-- they were already the one called first on SOS, this just names that tier.
UPDATE trusted_contacts SET permission_level = 'full' WHERE is_primary = TRUE;
