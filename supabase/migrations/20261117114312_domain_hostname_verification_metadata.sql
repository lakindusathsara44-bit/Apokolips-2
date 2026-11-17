alter table public.builder_domains
  add column if not exists cloudflare_ownership_verification jsonb;

alter table public.builder_domains
  drop constraint if exists builder_domains_cloudflare_ownership_verification_check;
alter table public.builder_domains
  add constraint builder_domains_cloudflare_ownership_verification_check
  check (
    cloudflare_ownership_verification is null
    or jsonb_typeof(cloudflare_ownership_verification) = 'object'
  );
