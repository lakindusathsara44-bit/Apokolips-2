-- Website-scoped media storage for the Apokolips visual builder.
-- Binary files live in Supabase Storage; page JSON stores only public file URLs.
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
create policy "Apokolips media owner can upload" on storage.objects for insert to authenticated
with check (bucket_id='apokolips-media' and exists(select 1 from public.builder_websites website where website.id::text=(storage.foldername(name))[1] and website.created_by=(select auth.uid())));
drop policy if exists "Apokolips media owner can list" on storage.objects;
create policy "Apokolips media owner can list" on storage.objects for select to authenticated
using (bucket_id='apokolips-media' and exists(select 1 from public.builder_websites website where website.id::text=(storage.foldername(name))[1] and website.created_by=(select auth.uid())));
drop policy if exists "Apokolips media owner can delete" on storage.objects;
create policy "Apokolips media owner can delete" on storage.objects for delete to authenticated
using (bucket_id='apokolips-media' and exists(select 1 from public.builder_websites website where website.id::text=(storage.foldername(name))[1] and website.created_by=(select auth.uid())));
