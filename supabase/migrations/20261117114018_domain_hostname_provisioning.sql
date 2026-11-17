-- Domain routing/SSL provisioning state and public resolver access.
-- Public clients can resolve only active hostnames and cannot read TXT secrets.
alter table public.builder_domains
  add column if not exists verified_at timestamptz,
  add column if not exists cloudflare_hostname_id text,
  add column if not exists cloudflare_hostname_status text,
  add column if not exists cloudflare_ssl_status text,
  add column if not exists cloudflare_validation_records jsonb not null default '[]'::jsonb,
  add column if not exists cname_target text,
  add column if not exists last_cloudflare_check_at timestamptz;

alter table public.builder_domains
  drop constraint if exists builder_domains_status_check;
alter table public.builder_domains
  add constraint builder_domains_status_check
  check (status in ('pending_setup','verified','provisioning','active','suspended'));

alter table public.builder_domains
  drop constraint if exists builder_domains_cloudflare_validation_records_check;
alter table public.builder_domains
  add constraint builder_domains_cloudflare_validation_records_check
  check (jsonb_typeof(cloudflare_validation_records) = 'array');

create unique index if not exists builder_domains_cloudflare_hostname_unique
  on public.builder_domains(cloudflare_hostname_id)
  where cloudflare_hostname_id is not null;

-- Keep the browser client from assigning lifecycle state or provider metadata.
revoke insert, update on table public.builder_domains from authenticated;
grant select, delete on table public.builder_domains to authenticated;
grant insert (workspace_id, website_id, domain, domain_type, verification_token, created_by)
  on table public.builder_domains to authenticated;

-- Edge routing only needs these non-secret columns. Do not expose verification tokens.
revoke all on table public.builder_domains from anon;
grant select (domain, website_id, status) on table public.builder_domains to anon;

drop policy if exists builder_domains_public_resolve_active on public.builder_domains;
create policy builder_domains_public_resolve_active
on public.builder_domains for select to anon
using (
  status = 'active'
  and exists (
    select 1
    from public.builder_websites w
    where w.id = website_id
      and w.status = 'published'
      and w.hosting_namespace = 'sales'
  )
);
