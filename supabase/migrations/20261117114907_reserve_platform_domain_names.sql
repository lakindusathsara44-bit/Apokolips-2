alter table public.builder_domains
  drop constraint if exists builder_domains_type_suffix;

alter table public.builder_domains
  add constraint builder_domains_type_suffix check (
    (
      domain_type = 'apokolips_subdomain'
      and domain like '%.apokolips.xyz'
      and domain <> 'apokolips.xyz'
      and domain not in (
        'www.apokolips.xyz',
        'sales.apokolips.xyz',
        'www.sales.apokolips.xyz',
        'constantine.apokolips.xyz',
        'www.constantine.apokolips.xyz',
        'learn.english.apokolips.xyz',
        'www.learn.english.apokolips.xyz',
        'gpa.calculator.apokolips.xyz',
        'www.gpa.calculator.apokolips.xyz',
        'dev.apokolips.xyz',
        'www.dev.apokolips.xyz',
        'api.apokolips.xyz',
        'admin.apokolips.xyz',
        'assets.apokolips.xyz',
        'static.apokolips.xyz'
      )
      and split_part(domain, '.', 1) not in (
        'www','sales','dev','api','admin','app','mail','ftp',
        'cdn','assets','static','status','support'
      )
    )
    or (
      domain_type in ('custom_domain','custom_subdomain')
      and domain <> 'apokolips.xyz'
      and domain not like '%.apokolips.xyz'
    )
  );
