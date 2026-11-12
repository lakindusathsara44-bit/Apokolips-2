-- Apokolips Community core schema
-- Safe to expose through the Data API only because every table has RLS enabled
-- and access is restricted to the policies and column grants below.

create table public.community_spaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(btrim(name)) between 2 and 50),
  description text not null default '' check (char_length(description) <= 240),
  created_at timestamptz not null default now()
);

create table public.community_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  bio text not null default '' check (char_length(bio) <= 160),
  avatar_url text check (avatar_url is null or avatar_url ~ '^https://'),
  created_at timestamptz not null default now()
);
create unique index community_profiles_username_lower_uidx on public.community_profiles (lower(username));

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.community_spaces(id) on delete restrict,
  author_id uuid not null references public.community_profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 180),
  body text not null default '' check (char_length(body) <= 10000),
  link_url text check (link_url is null or link_url ~ '^https://'),
  created_at timestamptz not null default now()
);
create index community_posts_created_at_idx on public.community_posts (created_at desc);
create index community_posts_space_created_idx on public.community_posts (space_id, created_at desc);
create index community_posts_author_idx on public.community_posts (author_id);

create table public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  parent_id uuid,
  author_id uuid not null references public.community_profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint community_comments_id_post_unique unique (id, post_id),
  constraint community_comments_parent_same_post_fkey
    foreign key (parent_id, post_id)
    references public.community_comments (id, post_id)
    on delete cascade
);
create index community_comments_post_created_idx on public.community_comments (post_id, created_at asc);
create index community_comments_parent_idx on public.community_comments (parent_id);

create table public.community_votes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index community_votes_user_idx on public.community_votes (user_id);

alter table public.community_spaces enable row level security;
alter table public.community_profiles enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_votes enable row level security;

create policy "Community spaces are public"
  on public.community_spaces for select to anon, authenticated using (true);
create policy "Community profiles are public"
  on public.community_profiles for select to anon, authenticated using (true);
create policy "Users create their own community profile"
  on public.community_profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "Users update their own community profile"
  on public.community_profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Community posts are public"
  on public.community_posts for select to anon, authenticated using (true);
create policy "Signed-in users create community posts"
  on public.community_posts for insert to authenticated
  with check ((select auth.uid()) = author_id);
create policy "Authors update their community posts"
  on public.community_posts for update to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);
create policy "Authors delete their community posts"
  on public.community_posts for delete to authenticated
  using ((select auth.uid()) = author_id);

create policy "Community comments are public"
  on public.community_comments for select to anon, authenticated using (true);
create policy "Signed-in users add community comments"
  on public.community_comments for insert to authenticated
  with check ((select auth.uid()) = author_id);
create policy "Authors delete their community comments"
  on public.community_comments for delete to authenticated
  using ((select auth.uid()) = author_id);

create policy "Community votes are public"
  on public.community_votes for select to anon, authenticated using (true);
create policy "Users cast their own community votes"
  on public.community_votes for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users update their own community votes"
  on public.community_votes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users remove their own community votes"
  on public.community_votes for delete to authenticated
  using ((select auth.uid()) = user_id);

grant usage on schema public to anon, authenticated;
grant select on public.community_spaces, public.community_profiles, public.community_posts,
  public.community_comments, public.community_votes to anon, authenticated;
grant insert (id, username, display_name, bio, avatar_url)
  on public.community_profiles to authenticated;
grant update (username, display_name, bio, avatar_url)
  on public.community_profiles to authenticated;
grant insert (space_id, author_id, title, body, link_url)
  on public.community_posts to authenticated;
grant update (title, body, link_url)
  on public.community_posts to authenticated;
grant delete on public.community_posts to authenticated;
grant insert (post_id, parent_id, author_id, body)
  on public.community_comments to authenticated;
grant delete on public.community_comments to authenticated;
grant insert (post_id, user_id, value)
  on public.community_votes to authenticated;
grant update (value)
  on public.community_votes to authenticated;
grant delete on public.community_votes to authenticated;

insert into public.community_spaces (slug, name, description)
values
  ('general', 'General', 'Open conversations, everyday discoveries, and ideas.'),
  ('technology', 'Technology', 'Software, devices, coding, and emerging technology.'),
  ('education', 'Education', 'Learning resources, study advice, and academic life.'),
  ('gaming', 'Gaming', 'Games, recommendations, and gaming discussions.'),
  ('showcase', 'Showcase', 'Share projects, creative work, and things you have built.'),
  ('help', 'Help & Questions', 'Ask questions and help other community members.')
on conflict (slug) do nothing;

do $$
declare target_table text;
begin
  foreach target_table in array array['community_posts','community_comments','community_votes']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = target_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', target_table);
    end if;
  end loop;
end $$;

alter table public.community_posts replica identity full;
alter table public.community_comments replica identity full;
alter table public.community_votes replica identity full;


-- Cover the comment-author and reply-parent foreign keys for efficient cascades and lookups.
create index if not exists community_comments_author_idx
  on public.community_comments (author_id);
create index if not exists community_comments_parent_post_idx
  on public.community_comments (parent_id, post_id);
