-- Phase 3: publish and serve customer websites inside Apokolips.
-- Public reads are restricted to published websites. No customer HTML/JS is executed.

grant select on public.builder_websites, public.builder_website_pages, public.builder_page_components to anon;
grant select on public.builder_websites, public.builder_website_pages, public.builder_page_components to authenticated;

create policy builder_websites_public_read_published
on public.builder_websites for select to anon, authenticated
using (hosting_namespace = 'sales' and status = 'published');

create policy builder_pages_public_read_published
on public.builder_website_pages for select to anon, authenticated
using (exists (
  select 1 from public.builder_websites w
  where w.id = website_id and w.hosting_namespace = 'sales' and w.status = 'published'
));

create policy builder_components_public_read_published
on public.builder_page_components for select to anon, authenticated
using (exists (
  select 1 from public.builder_website_pages p
  join public.builder_websites w on w.id = p.website_id
  where p.id = page_id and w.hosting_namespace = 'sales' and w.status = 'published'
));

create or replace function public.publish_builder_website(p_website_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_website public.builder_websites%rowtype;
  v_version integer;
  v_snapshot jsonb;
begin
  select w.* into v_website
  from public.builder_websites w
  join public.builder_workspace_members m on m.workspace_id = w.workspace_id
  where w.id = p_website_id and m.user_id = auth.uid() and m.role in ('owner','editor')
  for update of w;
  if not found then raise exception 'Website not found or permission denied'; end if;

  if not exists (select 1 from public.builder_website_pages p where p.website_id = p_website_id and p.is_homepage) then
    raise exception 'A homepage is required before publishing';
  end if;

  select coalesce(max(version_number),0)+1 into v_version
  from public.builder_website_versions where website_id = p_website_id;

  select jsonb_build_object(
    'website', jsonb_build_object('id',v_website.id,'name',v_website.name,'slug',v_website.slug),
    'pages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'title',p.title,'slug',p.slug,'is_homepage',p.is_homepage,
        'components',coalesce((
          select jsonb_agg(jsonb_build_object('type',c.component_type,'properties',c.properties,'sort_order',c.sort_order) order by c.sort_order)
          from public.builder_page_components c where c.page_id=p.id
        ),'[]'::jsonb)
      ) order by p.page_order)
      from public.builder_website_pages p where p.website_id=p_website_id
    ),'[]'::jsonb)
  ) into v_snapshot;

  insert into public.builder_website_versions(website_id,version_number,snapshot,created_by)
  values(p_website_id,v_version,v_snapshot,auth.uid());

  update public.builder_websites set status='published' where id=p_website_id;
  return jsonb_build_object('website_id',p_website_id,'status','published','version',v_version);
end;
$$;

create or replace function public.unpublish_builder_website(p_website_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.builder_websites w set status='draft'
  where w.id=p_website_id and exists (
    select 1 from public.builder_workspace_members m
    where m.workspace_id=w.workspace_id and m.user_id=auth.uid() and m.role in ('owner','editor')
  );
  if not found then raise exception 'Website not found or permission denied'; end if;
  return jsonb_build_object('website_id',p_website_id,'status','draft');
end;
$$;

revoke all on function public.publish_builder_website(uuid) from public, anon;
revoke all on function public.unpublish_builder_website(uuid) from public, anon;
revoke all on function public.unpublish_builder_website(uuid) from public, anon;
grant execute on function public.publish_builder_website(uuid) to authenticated;
grant execute on function public.unpublish_builder_website(uuid) to authenticated;
