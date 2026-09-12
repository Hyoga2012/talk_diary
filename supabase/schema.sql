-- Talk Diary Supabase schema
-- Run this in Supabase SQL Editor

-- Entries: classified diary records from voice
create type entry_category as enum ('schedule', 'thought', 'idea', 'note', 'todo');

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  device_id text,
  category entry_category not null default 'note',
  title text not null,
  content text not null,
  raw_transcript text,
  entry_date date not null default (timezone('Asia/Seoul', now()))::date,
  scheduled_at timestamptz,
  audio_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entries_owner check (user_id is not null or device_id is not null)
);

create index if not exists entries_entry_date_idx on public.entries (entry_date desc);
create index if not exists entries_user_id_idx on public.entries (user_id);
create index if not exists entries_device_id_idx on public.entries (device_id);

-- Todos: auto-extracted or linked from entries
create type todo_status as enum ('pending', 'in_progress', 'done');

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  device_id text,
  entry_id uuid references public.entries(id) on delete set null,
  title text not null,
  status todo_status not null default 'pending',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint todos_owner check (user_id is not null or device_id is not null)
);

create index if not exists todos_status_idx on public.todos (status);
create index if not exists todos_user_id_idx on public.todos (user_id);
create index if not exists todos_device_id_idx on public.todos (device_id);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists entries_set_updated_at on public.entries;
create trigger entries_set_updated_at
  before update on public.entries
  for each row execute function public.set_updated_at();

drop trigger if exists todos_set_updated_at on public.todos;
create trigger todos_set_updated_at
  before update on public.todos
  for each row execute function public.set_updated_at();

-- RLS
alter table public.entries enable row level security;
alter table public.todos enable row level security;

-- Authenticated users: own rows only
create policy "entries_select_own" on public.entries
  for select using (auth.uid() = user_id);

create policy "entries_insert_own" on public.entries
  for insert with check (auth.uid() = user_id);

create policy "entries_update_own" on public.entries
  for update using (auth.uid() = user_id);

create policy "entries_delete_own" on public.entries
  for delete using (auth.uid() = user_id);

create policy "todos_select_own" on public.todos
  for select using (auth.uid() = user_id);

create policy "todos_insert_own" on public.todos
  for insert with check (auth.uid() = user_id);

create policy "todos_update_own" on public.todos
  for update using (auth.uid() = user_id);

create policy "todos_delete_own" on public.todos
  for delete using (auth.uid() = user_id);

-- Guest / device_id access via service role in API routes (recommended).
-- If you prefer anon client with device_id, add policies carefully.

-- Audio storage bucket (run in Storage or via dashboard)
-- Bucket name: voice-recordings
-- Public: false
insert into storage.buckets (id, name, public)
values ('voice-recordings', 'voice-recordings', false)
on conflict (id) do nothing;

create policy "voice_upload_own"
  on storage.objects for insert
  with check (
    bucket_id = 'voice-recordings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "voice_read_own"
  on storage.objects for select
  using (
    bucket_id = 'voice-recordings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
