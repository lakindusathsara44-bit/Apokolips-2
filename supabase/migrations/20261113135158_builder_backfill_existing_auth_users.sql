-- Give existing Apokolips Auth users a builder workspace as well.
-- This is additive and does not alter their existing application data.
do $$
declare
  u record;
  v_display_name text;
  v_workspace_id uuid;
begin
  for u in select id, email, raw_user_meta_data from auth.users loop
    v_display_name := left(coalesce(
      nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(u.email, 'user'), '@', 1), ''),
      'User'
    ), 80);
    insert into public.builder_profiles(user_id, display_name)
    values (u.id, v_display_name) on conflict (user_id) do nothing;
    select id into v_workspace_id from public.builder_workspaces
    where owner_id = u.id order by created_at limit 1;
    if v_workspace_id is null then
      insert into public.builder_workspaces(name, owner_id)
      values (left(v_display_name || '''s Workspace', 80), u.id)
      returning id into v_workspace_id;
    end if;
    insert into public.builder_workspace_members(workspace_id, user_id, role)
    values (v_workspace_id, u.id, 'owner')
    on conflict (workspace_id, user_id) do nothing;
  end loop;
end;
$$;
