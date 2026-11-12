create table if not exists public.apokolips_blog_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.apokolips_blog_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_visitor_id uuid not null,
  notification_type text not null check (notification_type in ('reply', 'new_photo')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 300),
  target_url text not null default '/blog.html',
  source_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists apokolips_blog_notifications_recipient_created_idx
  on public.apokolips_blog_notifications (recipient_visitor_id, created_at desc);

create table if not exists public.apokolips_blog_media_events (
  id uuid primary key default gen_random_uuid(),
  file_path text not null unique,
  created_at timestamptz not null default now()
);

alter table public.apokolips_blog_push_subscriptions enable row level security;
alter table public.apokolips_blog_notifications enable row level security;
alter table public.apokolips_blog_media_events enable row level security;

drop policy if exists "Blog visitors read own push subscriptions" on public.apokolips_blog_push_subscriptions;
create policy "Blog visitors read own push subscriptions"
  on public.apokolips_blog_push_subscriptions for select to anon
  using (visitor_id = nullif(current_setting('request.headers', true)::jsonb ->> 'x-blog-visitor', '')::uuid);

drop policy if exists "Blog visitors create own push subscriptions" on public.apokolips_blog_push_subscriptions;
create policy "Blog visitors create own push subscriptions"
  on public.apokolips_blog_push_subscriptions for insert to anon
  with check (visitor_id = nullif(current_setting('request.headers', true)::jsonb ->> 'x-blog-visitor', '')::uuid);

drop policy if exists "Blog visitors update own push subscriptions" on public.apokolips_blog_push_subscriptions;
create policy "Blog visitors update own push subscriptions"
  on public.apokolips_blog_push_subscriptions for update to anon
  using (visitor_id = nullif(current_setting('request.headers', true)::jsonb ->> 'x-blog-visitor', '')::uuid)
  with check (visitor_id = nullif(current_setting('request.headers', true)::jsonb ->> 'x-blog-visitor', '')::uuid);

drop policy if exists "Blog visitors delete own push subscriptions" on public.apokolips_blog_push_subscriptions;
create policy "Blog visitors delete own push subscriptions"
  on public.apokolips_blog_push_subscriptions for delete to anon
  using (visitor_id = nullif(current_setting('request.headers', true)::jsonb ->> 'x-blog-visitor', '')::uuid);

drop policy if exists "Blog visitors read own notifications" on public.apokolips_blog_notifications;
create policy "Blog visitors read own notifications"
  on public.apokolips_blog_notifications for select to anon
  using (recipient_visitor_id = nullif(current_setting('request.headers', true)::jsonb ->> 'x-blog-visitor', '')::uuid);

drop policy if exists "Blog visitors mark own notifications read" on public.apokolips_blog_notifications;
create policy "Blog visitors mark own notifications read"
  on public.apokolips_blog_notifications for update to anon
  using (recipient_visitor_id = nullif(current_setting('request.headers', true)::jsonb ->> 'x-blog-visitor', '')::uuid)
  with check (recipient_visitor_id = nullif(current_setting('request.headers', true)::jsonb ->> 'x-blog-visitor', '')::uuid);

grant select, insert, update, delete on public.apokolips_blog_push_subscriptions to anon;
grant select on public.apokolips_blog_notifications to anon;
grant update (read_at) on public.apokolips_blog_notifications to anon;
revoke all on public.apokolips_blog_media_events from anon, authenticated;
grant all on public.apokolips_blog_media_events to service_role;
revoke insert, delete on public.apokolips_blog_notifications from anon, authenticated;
grant select, update (read_at) on public.apokolips_blog_notifications to anon;

create or replace function public.apokolips_blog_create_reply_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient_id uuid;
begin
  if new.parent_comment_id is null then
    return new;
  end if;

  select visitor_id into recipient_id
  from public.apokolips_blog_comments
  where id = new.parent_comment_id
    and post_slug = new.post_slug;

  if recipient_id is not null and recipient_id <> new.visitor_id then
    insert into public.apokolips_blog_notifications
      (recipient_visitor_id, notification_type, title, body, target_url, source_id)
    values
      (recipient_id, 'reply', 'New reply to your comment',
       left(new.display_name || ': ' || new.body, 300),
       '/blog.html#comment-' || new.parent_comment_id::text, new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists apokolips_blog_reply_notification on public.apokolips_blog_comments;
create trigger apokolips_blog_reply_notification
after insert on public.apokolips_blog_comments
for each row execute function public.apokolips_blog_create_reply_notification();

create or replace function public.apokolips_blog_notify_commenters_of_new_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient record;
begin
  for recipient in
    select distinct visitor_id
    from public.apokolips_blog_comments
    where visitor_id is not null
  loop
    insert into public.apokolips_blog_notifications
      (recipient_visitor_id, notification_type, title, body, target_url, source_id)
    values
      (recipient.visitor_id, 'new_photo', 'A new photo was added to Apokolips Blog',
       'There is a new photo in the travel memories. Open the blog to see it.',
       '/blog.html#memories', new.id);
  end loop;
  return new;
end;
$$;

drop trigger if exists apokolips_blog_new_photo_notification on public.apokolips_blog_media_events;
create trigger apokolips_blog_new_photo_notification
after insert on public.apokolips_blog_media_events
for each row execute function public.apokolips_blog_notify_commenters_of_new_photo();

revoke all on function public.apokolips_blog_create_reply_notification() from public, anon, authenticated;
revoke all on function public.apokolips_blog_notify_commenters_of_new_photo() from public, anon, authenticated;
