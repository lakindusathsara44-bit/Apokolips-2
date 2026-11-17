-- Correct the domain hostname expression and index the creator foreign key.
-- The base migration is replayable with this correction on new environments.

alter table public.builder_domains
  drop constraint if exists builder_domains_domain_format;

alter table public.builder_domains
  add constraint builder_domains_domain_format check (
    domain = lower(domain)
    and char_length(domain) between 4 and 253
    and domain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
  );

create index if not exists builder_domains_created_by_idx
  on public.builder_domains(created_by);
