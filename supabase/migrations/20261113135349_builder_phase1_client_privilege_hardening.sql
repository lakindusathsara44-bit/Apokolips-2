-- Restrict client-side updates to fields the Phase 1 UI is allowed to change.
revoke update on public.builder_profiles from authenticated;
grant update (display_name, avatar_url) on public.builder_profiles to authenticated;

revoke update on public.builder_workspaces from authenticated;
grant update (name) on public.builder_workspaces to authenticated;

drop policy if exists builder_workspaces_update_owner on public.builder_workspaces;
create policy builder_workspaces_update_owner on public.builder_workspaces
for update to authenticated
using (
  owner_id = (select auth.uid())
  and app_private.has_builder_workspace_role(id, array['owner'])
)
with check (
  owner_id = (select auth.uid())
  and app_private.has_builder_workspace_role(id, array['owner'])
);

drop policy if exists builder_websites_insert_editor on public.builder_websites;
create policy builder_websites_insert_editor on public.builder_websites
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and status = 'draft'
  and app_private.has_builder_workspace_role(workspace_id, array['owner','editor'])
);

revoke update on public.builder_websites from authenticated;
grant update (name, slug) on public.builder_websites to authenticated;

drop policy if exists builder_websites_update_editor on public.builder_websites;
create policy builder_websites_update_editor on public.builder_websites
for update to authenticated
using (
  status = 'draft'
  and app_private.has_builder_workspace_role(workspace_id, array['owner','editor'])
)
with check (
  status = 'draft'
  and app_private.has_builder_workspace_role(workspace_id, array['owner','editor'])
);
