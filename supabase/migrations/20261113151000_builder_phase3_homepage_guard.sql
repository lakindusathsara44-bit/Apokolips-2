-- Require the automatic Home page before a project can be published.
create or replace function public.publish_builder_website(p_website_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.builder_website_pages
    where website_id=p_website_id and is_homepage=true
  ) then
    raise exception 'A homepage is required before publishing';
  end if;

  update public.builder_websites
  set status='published'
  where id=p_website_id and app_private.can_edit_builder_website(id);
  if not found then raise exception 'Website not found or permission denied'; end if;
  return jsonb_build_object('website_id',p_website_id,'status','published');
end;
$$;
revoke all on function public.publish_builder_website(uuid) from public, anon;
grant execute on function public.publish_builder_website(uuid) to authenticated;
