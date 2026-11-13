-- Harden Phase 3 publication: public RPCs run as invoker; private trigger records versions.
drop policy if exists builder_websites_update_editor on public.builder_websites;
create policy builder_websites_update_editor on public.builder_websites
for update to authenticated
using (app_private.can_edit_builder_website(id))
with check (app_private.can_edit_builder_website(id));

grant update (status) on public.builder_websites to authenticated;

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
          'components',coalesce((
            select jsonb_agg(jsonb_build_object('type',c.component_type,'properties',c.properties,'sort_order',c.sort_order) order by c.sort_order)
            from public.builder_page_components c where c.page_id=p.id
          ),'[]'::jsonb)
        ) order by p.page_order)
        from public.builder_website_pages p where p.website_id=new.id
      ),'[]'::jsonb)
    ) into v_snapshot;

    insert into public.builder_website_versions(website_id,version_number,snapshot,created_by)
    values(new.id,v_version,v_snapshot,auth.uid());
  end if;
  return new;
end;
$$;

revoke all on function app_private.snapshot_builder_website_on_publish() from public, anon, authenticated;
drop trigger if exists builder_website_snapshot_on_publish on public.builder_websites;
create trigger builder_website_snapshot_on_publish
before update of status on public.builder_websites
for each row execute function app_private.snapshot_builder_website_on_publish();

create or replace function public.publish_builder_website(p_website_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.builder_websites
  set status='published'
  where id=p_website_id and app_private.can_edit_builder_website(id);
  if not found then raise exception 'Website not found or permission denied'; end if;
  return jsonb_build_object('website_id',p_website_id,'status','published');
end;
$$;

create or replace function public.unpublish_builder_website(p_website_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.builder_websites
  set status='draft'
  where id=p_website_id and app_private.can_edit_builder_website(id);
  if not found then raise exception 'Website not found or permission denied'; end if;
  return jsonb_build_object('website_id',p_website_id,'status','draft');
end;
$$;

revoke all on function public.publish_builder_website(uuid) from public, anon;
revoke all on function public.unpublish_builder_website(uuid) from public, anon;
grant execute on function public.publish_builder_website(uuid) to authenticated;
grant execute on function public.unpublish_builder_website(uuid) to authenticated;
