-- Domain Management System foundation.
-- This migration stores domain requests and per-domain TXT ownership challenges.
-- It intentionally does not mark domains active: the current static host has no
-- wildcard hostname router or automated DNS/SSL provisioning yet.

create table if not exists public.builder_domains (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.builder_workspaces(id) on delete cascade,
  website_id uuid not null references public.builder_websites(id) on delete cascade,
  domain text not null,
  domain_type text not null check (domain_type in ('custom_domain','custom_subdomain','apokolips_subdomain')),
  status text not null default 'pending_setup' check (status in ('pending_setup','verified','active','suspended')),
  verification_token text not null check (verification_token ~ '^apokolips-verification=[a-f0-9]{48}$'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint builder_domains_domain_format check (
    domain = lower(domain)
    and char_length(domain) between 4 and 253
    and domain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
  ),
  constraint builder_domains_type_suffix check (
    (domain_type = 'apokolips_subdomain' and domain like '%.apokolips.xyz' and domain <> 'apokolips.xyz')
    or (domain_type in ('custom_domain','custom_subdomain') and domain not like '%.apokolips.xyz')
  ),
  constraint builder_domains_domain_unique unique(domain)
);

create index if not exists builder_domains_workspace_idx
  on public.builder_domains(workspace_id, created_at desc);
create index if not exists builder_domains_website_idx
  on public.builder_domains(website_id);

alter table public.builder_domains enable row level security;
revoke all on public.builder_domains from public, anon, authenticated;
grant select, insert, delete on public.builder_domains to authenticated;

drop policy if exists builder_domains_select_member on public.builder_domains;
create policy builder_domains_select_member on public.builder_domains
for select to authenticated
using (app_private.has_builder_workspace_role(workspace_id, array['owner','editor','viewer']));

drop policy if exists builder_domains_insert_editor on public.builder_domains;
create policy builder_domains_insert_editor on public.builder_domains
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and app_private.has_builder_workspace_role(workspace_id, array['owner','editor'])
  and exists (
    select 1 from public.builder_websites w
    where w.id = website_id and w.workspace_id = builder_domains.workspace_id
  )
);

drop policy if exists builder_domains_delete_editor on public.builder_domains;
create policy builder_domains_delete_editor on public.builder_domains
for delete to authenticated
using (app_private.has_builder_workspace_role(workspace_id, array['owner','editor']));

create or replace function app_private.touch_builder_domain_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function app_private.touch_builder_domain_updated_at() from public, anon, authenticated;
drop trigger if exists builder_domains_touch_updated_at on public.builder_domains;
create trigger builder_domains_touch_updated_at
before update on public.builder_domains
for each row execute function app_private.touch_builder_domain_updated_at();
