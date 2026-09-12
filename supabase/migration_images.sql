-- Run in Supabase SQL Editor (existing projects)
-- Safe to re-run: drops policies if they already exist

alter table public.entries
  add column if not exists images jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public)
values ('entry-images', 'entry-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "entry_images_public_read" on storage.objects;
drop policy if exists "entry_images_service_insert" on storage.objects;
drop policy if exists "entry_images_service_delete" on storage.objects;

create policy "entry_images_public_read"
  on storage.objects for select
  using (bucket_id = 'entry-images');

create policy "entry_images_service_insert"
  on storage.objects for insert
  with check (bucket_id = 'entry-images');

create policy "entry_images_service_delete"
  on storage.objects for delete
  using (bucket_id = 'entry-images');
