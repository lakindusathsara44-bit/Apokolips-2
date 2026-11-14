-- Website-scoped media storage for the Apokolips visual builder.
-- Binary files live in Supabase Storage; page JSON stores only public file URLs.
-- Existing builder permission helpers keep workspace editors/members aligned with website access.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('apokolips-media','apokolips-media',true,104857600,array[
'image/jpeg','image/png','image/webp','image/gif','image/avif','video/mp4','video/webm','video/ogg',
'audio/mpeg','audio/mp4','audio/wav','audio/ogg','audio/webm','application/pdf','application/msword',
'application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','text/csv',
'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/zip'
]::text[])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Apokolips media owner can upload" on storage.objects;
drop policy if exists "Apokolips media owner can list" on storage.objects;
drop policy if exists "Apokolips media owner can delete" on storage.objects;
drop policy if exists "Apokolips media editor can upload" on storage.objects;
drop policy if exists "Apokolips media member can list" on storage.objects;
drop policy if exists "Apokolips media editor can delete" on storage.objects;
create policy "Apokolips media editor can upload" on storage.objects for insert to authenticated
with check (bucket_id='apokolips-media' and app_private.can_edit_builder_website(((storage.foldername(name))[1])::uuid));
create policy "Apokolips media member can list" on storage.objects for select to authenticated
using (bucket_id='apokolips-media' and app_private.can_view_builder_website(((storage.foldername(name))[1])::uuid));
create policy "Apokolips media editor can delete" on storage.objects for delete to authenticated
using (bucket_id='apokolips-media' and app_private.can_edit_builder_website(((storage.foldername(name))[1])::uuid));
