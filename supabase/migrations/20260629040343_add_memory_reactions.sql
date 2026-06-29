alter table public.memories
add column if not exists reactions jsonb not null default '{}'::jsonb;
