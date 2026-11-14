alter table public.builder_website_pages
  add column if not exists settings jsonb not null default '{}'::jsonb;

alter table public.builder_website_pages
  drop constraint if exists builder_website_pages_settings_object;
alter table public.builder_website_pages
  add constraint builder_website_pages_settings_object
  check (jsonb_typeof(settings) = 'object' and pg_column_size(settings) <= 16384);

create or replace function app_private.snapshot_builder_website_on_publish()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version integer;
  v_snapshot jsonb;
begin
  if new.status = 'published' and old.status is distinct from 'published' then
    select coalesce(max(version_number),0)+1 into v_version
    from public.builder_website_versions where website_id = new.id;

    select jsonb_build_object(
      'website', jsonb_build_object('id',new.id,'name',new.name,'slug',new.slug),
      'pages', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',p.id,'title',p.title,'slug',p.slug,'is_homepage',p.is_homepage,
          'settings',p.settings,
          'components',coalesce((
            select jsonb_agg(jsonb_build_object('type',c.component_type,'properties',c.properties,'sort_order',c.sort_order) order by c.sort_order)
            from public.builder_page_components c where c.page_id=p.id
          ),'[]'::jsonb)
        ) order by p.page_order)
        from public.builder_website_pages p where p.website_id = new.id
      ),'[]'::jsonb)
    ) into v_snapshot;

    insert into public.builder_website_versions(website_id,version_number,snapshot,created_by)
    values(new.id,v_version,v_snapshot,auth.uid());
  end if;
  return new;
end;
$$;

revoke all on function app_private.snapshot_builder_website_on_publish() from public, anon, authenticated;
