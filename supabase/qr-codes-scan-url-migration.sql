-- One-time migration: add fixed Smart QR redirect columns to an existing
-- public.qr_codes table (already included in schema.sql for fresh installs).
--
-- Run this once in the Supabase SQL Editor for existing projects.

alter table public.qr_codes add column if not exists scan_url text;
alter table public.qr_codes add column if not exists public_code text;
alter table public.qr_codes add column if not exists design_logo_url text;

create unique index if not exists qr_codes_public_code_idx
  on public.qr_codes (public_code)
  where public_code is not null;
