-- Add richer identity and phone verification fields to user profiles.
-- Run in Supabase SQL Editor.

alter table public.profiles
  add column if not exists phone_verified_at timestamptz,
  add column if not exists gender text,
  add column if not exists pronouns text,
  add column if not exists date_of_birth date,
  add column if not exists accessibility_notes text;
