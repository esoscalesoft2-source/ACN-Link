-- Run once in Supabase Dashboard → SQL Editor for existing ACN Link projects.
-- New projects can run the full supabase/schema.sql instead.

alter table public.custom_domains add column if not exists page_id text;
alter table public.custom_domains add column if not exists dns_target text not null default '';
alter table public.custom_domains add column if not exists dns_verified_at timestamptz;
alter table public.custom_domains add column if not exists provider text not null default 'manual';
alter table public.custom_domains add column if not exists provider_hostname_id text;
alter table public.custom_domains add column if not exists provider_status text not null default 'pending';
alter table public.custom_domains add column if not exists ssl_status text not null default 'pending';
alter table public.custom_domains add column if not exists ownership_verification jsonb;
alter table public.custom_domains add column if not exists last_checked_at timestamptz;
alter table public.custom_domains add column if not exists error_message text;
alter table public.custom_domains add column if not exists created_at timestamptz not null default now();

create unique index if not exists custom_domains_hostname_unique
  on public.custom_domains (lower(domain_name));
create index if not exists custom_domains_owner_idx
  on public.custom_domains (owner_user_id);

-- Remove old demo rows that were never owned by an authenticated account.
delete from public.custom_domains where owner_user_id is null;
