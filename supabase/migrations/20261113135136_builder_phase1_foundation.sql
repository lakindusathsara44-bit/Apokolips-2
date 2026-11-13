-- Apokolips Website Builder: Phase 1 foundation
-- Isolated builder_* tables so existing Apokolips services remain untouched.

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to authenticated;

create table if not exists public.builder_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.builder_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.builder_workspace_members (
  workspace_id uuid not null references public.builder_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.builder_websites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.builder_workspaces(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  slug text not null check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?$'
    and slug not in ('api','assets','admin','health','_next')
  ),
  hosting_namespace text not null default 'sales' check (hosting_namespace = 'sales'),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint builder_websites_host_slug_unique unique (hosting_namespace, slug)
);

create table if not exists public.builder_website_pages (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.builder_websites(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  slug text not null check (slug = 'home' or (
    slug = lower(slug) and slug ~ '^[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?$'
  )),
  page_order integer not null default 0 check (page_order between 0 and 500),
  is_homepage boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint builder_website_pages_slug_unique unique (website_id, slug)
);

create unique index if not exists builder_one_homepage_per_website
  on public.builder_website_pages(website_id) where is_homepage;

create table if not exists public.builder_page_components (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.builder_website_pages(id) on delete cascade,
  component_type text not null check (component_type in (
    'heading','text','image','button','container','columns','card','navbar','footer'
  )),
  properties jsonb not null default '{}'::jsonb check (
    jsonb_typeof(properties) = 'object' and pg_column_size(properties) <= 65536
  ),
  sort_order integer not null default 0 check (sort_order between 0 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.builder_website_versions (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.builder_websites(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (website_id, version_number)
);

create index if not exists builder_workspaces_owner_idx on public.builder_workspaces(owner_id);
create index if not exists builder_members_user_idx on public.builder_workspace_members(user_id);
create index if not exists builder_websites_workspace_idx on public.builder_websites(workspace_id);
create index if not exists builder_pages_website_idx on public.builder_website_pages(website_id, page_order);
create index if not exists builder_components_page_idx on public.builder_page_components(page_id, sort_order);
create index if not exists builder_versions_website_idx on public.builder_website_versions(website_id, version_number desc);

create or replace function app_private.has_builder_workspace_role(p_workspace_id uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.builder_workspace_members m
    where m.workspace_id = p_workspace_id
      and m.user_id = (select auth.uid())
      and m.role = any(p_roles)
  );
$$;

create or replace function app_private.can_view_builder_website(p_website_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.builder_websites w
    join public.builder_workspace_members m on m.workspace_id = w.workspace_id
    where w.id = p_website_id and m.user_id = (select auth.uid())
  );
$$;

create or replace function app_private.can_edit_builder_website(p_website_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.builder_websites w
    join public.builder_workspace_members m on m.workspace_id = w.workspace_id
    where w.id = p_website_id and m.user_id = (select auth.uid())
      and m.role in ('owner','editor')
  );
$$;

create or replace function app_private.can_delete_builder_website(p_website_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.builder_websites w
    join public.builder_workspace_members m on m.workspace_id = w.workspace_id
    where w.id = p_website_id and m.user_id = (select auth.uid())
      and m.role = 'owner'
  );
$$;

create or replace function app_private.can_view_builder_page(p_page_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.builder_website_pages p
    join public.builder_websites w on w.id = p.website_id
    join public.builder_workspace_members m on m.workspace_id = w.workspace_id
    where p.id = p_page_id and m.user_id = (select auth.uid())
  );
$$;

create or replace function app_private.can_edit_builder_page(p_page_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.builder_website_pages p
    join public.builder_websites w on w.id = p.website_id
    join public.builder_workspace_members m on m.workspace_id = w.workspace_id
    where p.id = p_page_id and m.user_id = (select auth.uid())
      and m.role in ('owner','editor')
  );
$$;

revoke all on function app_private.has_builder_workspace_role(uuid,text[]) from public, anon;
revoke all on function app_private.can_view_builder_website(uuid) from public, anon;
revoke all on function app_private.can_edit_builder_website(uuid) from public, anon;
revoke all on function app_private.can_delete_builder_website(uuid) from public, anon;
revoke all on function app_private.can_view_builder_page(uuid) from public, anon;
revoke all on function app_private.can_edit_builder_page(uuid) from public, anon;
grant execute on function app_private.has_builder_workspace_role(uuid,text[]) to authenticated;
grant execute on function app_private.can_view_builder_website(uuid) to authenticated;
grant execute on function app_private.can_edit_builder_website(uuid) to authenticated;
grant execute on function app_private.can_delete_builder_website(uuid) to authenticated;
grant execute on function app_private.can_view_builder_page(uuid) to authenticated;
grant execute on function app_private.can_edit_builder_page(uuid) to authenticated;

create or replace function app_private.handle_builder_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_display_name text;
  v_workspace_id uuid;
begin
  v_display_name := left(coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(new.email, 'user'), '@', 1), ''),
    'User'
  ), 80);
  insert into public.builder_profiles(user_id, display_name)
  values (new.id, v_display_name) on conflict (user_id) do nothing;
  insert into public.builder_workspaces(name, owner_id)
  values (left(v_display_name || '''s Workspace', 80), new.id)
  returning id into v_workspace_id;
  insert into public.builder_workspace_members(workspace_id, user_id, role)
  values (v_workspace_id, new.id, 'owner') on conflict (workspace_id, user_id) do nothing;
  return new;
end;
$$;
revoke all on function app_private.handle_builder_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_builder on auth.users;
create trigger on_auth_user_created_builder after insert on auth.users
for each row execute function app_private.handle_builder_new_user();

create or replace function app_private.create_builder_homepage()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.builder_website_pages(website_id, title, slug, page_order, is_homepage)
  values (new.id, 'Home', 'home', 0, true);
  return new;
end;
$$;
revoke all on function app_private.create_builder_homepage() from public, anon, authenticated;
drop trigger if exists builder_website_create_homepage on public.builder_websites;
create trigger builder_website_create_homepage after insert on public.builder_websites
for each row execute function app_private.create_builder_homepage();

create or replace function app_private.touch_builder_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function app_private.touch_builder_updated_at() from public, anon, authenticated;
drop trigger if exists builder_profiles_touch_updated_at on public.builder_profiles;
create trigger builder_profiles_touch_updated_at before update on public.builder_profiles
for each row execute function app_private.touch_builder_updated_at();
drop trigger if exists builder_workspaces_touch_updated_at on public.builder_workspaces;
create trigger builder_workspaces_touch_updated_at before update on public.builder_workspaces
for each row execute function app_private.touch_builder_updated_at();
drop trigger if exists builder_websites_touch_updated_at on public.builder_websites;
create trigger builder_websites_touch_updated_at before update on public.builder_websites
for each row execute function app_private.touch_builder_updated_at();
drop trigger if exists builder_pages_touch_updated_at on public.builder_website_pages;
create trigger builder_pages_touch_updated_at before update on public.builder_website_pages
for each row execute function app_private.touch_builder_updated_at();
drop trigger if exists builder_components_touch_updated_at on public.builder_page_components;
create trigger builder_components_touch_updated_at before update on public.builder_page_components
for each row execute function app_private.touch_builder_updated_at();

alter table public.builder_profiles enable row level security;
alter table public.builder_workspaces enable row level security;
alter table public.builder_workspace_members enable row level security;
alter table public.builder_websites enable row level security;
alter table public.builder_website_pages enable row level security;
alter table public.builder_page_components enable row level security;
alter table public.builder_website_versions enable row level security;

drop policy if exists builder_profiles_select_own on public.builder_profiles;
create policy builder_profiles_select_own on public.builder_profiles
for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists builder_profiles_update_own on public.builder_profiles;
create policy builder_profiles_update_own on public.builder_profiles
for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists builder_workspaces_select_member on public.builder_workspaces;
create policy builder_workspaces_select_member on public.builder_workspaces
for select to authenticated using (app_private.has_builder_workspace_role(id, array['owner','editor','viewer']));
drop policy if exists builder_workspaces_update_owner on public.builder_workspaces;
create policy builder_workspaces_update_owner on public.builder_workspaces
for update to authenticated using (app_private.has_builder_workspace_role(id, array['owner']))
with check (app_private.has_builder_workspace_role(id, array['owner']));

drop policy if exists builder_members_select_workspace on public.builder_workspace_members;
create policy builder_members_select_workspace on public.builder_workspace_members
for select to authenticated using (app_private.has_builder_workspace_role(workspace_id, array['owner','editor','viewer']));

drop policy if exists builder_websites_select_member on public.builder_websites;
create policy builder_websites_select_member on public.builder_websites
for select to authenticated using (app_private.has_builder_workspace_role(workspace_id, array['owner','editor','viewer']));
drop policy if exists builder_websites_insert_editor on public.builder_websites;
create policy builder_websites_insert_editor on public.builder_websites
for insert to authenticated with check (created_by = (select auth.uid())
  and app_private.has_builder_workspace_role(workspace_id, array['owner','editor']));
drop policy if exists builder_websites_update_editor on public.builder_websites;
create policy builder_websites_update_editor on public.builder_websites
for update to authenticated using (app_private.has_builder_workspace_role(workspace_id, array['owner','editor']))
with check (app_private.has_builder_workspace_role(workspace_id, array['owner','editor']));
drop policy if exists builder_websites_delete_owner on public.builder_websites;
create policy builder_websites_delete_owner on public.builder_websites
for delete to authenticated using (app_private.has_builder_workspace_role(workspace_id, array['owner']));

drop policy if exists builder_pages_select_member on public.builder_website_pages;
create policy builder_pages_select_member on public.builder_website_pages
for select to authenticated using (app_private.can_view_builder_website(website_id));
drop policy if exists builder_pages_insert_editor on public.builder_website_pages;
create policy builder_pages_insert_editor on public.builder_website_pages
for insert to authenticated with check (app_private.can_edit_builder_website(website_id));
drop policy if exists builder_pages_update_editor on public.builder_website_pages;
create policy builder_pages_update_editor on public.builder_website_pages
for update to authenticated using (app_private.can_edit_builder_website(website_id))
with check (app_private.can_edit_builder_website(website_id));
drop policy if exists builder_pages_delete_editor on public.builder_website_pages;
create policy builder_pages_delete_editor on public.builder_website_pages
for delete to authenticated using (app_private.can_edit_builder_website(website_id));

drop policy if exists builder_components_select_member on public.builder_page_components;
create policy builder_components_select_member on public.builder_page_components
for select to authenticated using (app_private.can_view_builder_page(page_id));
drop policy if exists builder_components_insert_editor on public.builder_page_components;
create policy builder_components_insert_editor on public.builder_page_components
for insert to authenticated with check (app_private.can_edit_builder_page(page_id));
drop policy if exists builder_components_update_editor on public.builder_page_components;
create policy builder_components_update_editor on public.builder_page_components
for update to authenticated using (app_private.can_edit_builder_page(page_id))
with check (app_private.can_edit_builder_page(page_id));
drop policy if exists builder_components_delete_editor on public.builder_page_components;
create policy builder_components_delete_editor on public.builder_page_components
for delete to authenticated using (app_private.can_edit_builder_page(page_id));

drop policy if exists builder_versions_select_member on public.builder_website_versions;
create policy builder_versions_select_member on public.builder_website_versions
for select to authenticated using (app_private.can_view_builder_website(website_id));
drop policy if exists builder_versions_insert_editor on public.builder_website_versions;
create policy builder_versions_insert_editor on public.builder_website_versions
for insert to authenticated with check (created_by = (select auth.uid())
  and app_private.can_edit_builder_website(website_id));

revoke all on public.builder_profiles, public.builder_workspaces, public.builder_workspace_members,
  public.builder_websites, public.builder_website_pages, public.builder_page_components,
  public.builder_website_versions from public, anon, authenticated;
grant select, update on public.builder_profiles to authenticated;
grant select, update on public.builder_workspaces to authenticated;
grant select on public.builder_workspace_members to authenticated;
grant select, insert, update, delete on public.builder_websites to authenticated;
grant select, insert, update, delete on public.builder_website_pages to authenticated;
grant select, insert, update, delete on public.builder_page_components to authenticated;
grant select, insert on public.builder_website_versions to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('builder-assets', 'builder-assets', false, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists builder_assets_select_member on storage.objects;
create policy builder_assets_select_member on storage.objects
for select to authenticated using (bucket_id = 'builder-assets'
  and app_private.can_view_builder_website(((storage.foldername(name))[1])::uuid));
drop policy if exists builder_assets_insert_editor on storage.objects;
create policy builder_assets_insert_editor on storage.objects
for insert to authenticated with check (bucket_id = 'builder-assets'
  and app_private.can_edit_builder_website(((storage.foldername(name))[1])::uuid));
drop policy if exists builder_assets_update_editor on storage.objects;
create policy builder_assets_update_editor on storage.objects
for update to authenticated using (bucket_id = 'builder-assets'
  and app_private.can_edit_builder_website(((storage.foldername(name))[1])::uuid))
with check (bucket_id = 'builder-assets'
  and app_private.can_edit_builder_website(((storage.foldername(name))[1])::uuid));
drop policy if exists builder_assets_delete_editor on storage.objects;
create policy builder_assets_delete_editor on storage.objects
for delete to authenticated using (bucket_id = 'builder-assets'
  and app_private.can_edit_builder_website(((storage.foldername(name))[1])::uuid));
