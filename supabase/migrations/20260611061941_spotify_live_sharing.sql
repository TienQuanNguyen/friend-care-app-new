create table public.spotify_live_shares (
  id uuid primary key default gen_random_uuid(),
  care_space_id uuid not null references public.care_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sharing_enabled boolean not null default false,
  is_playing boolean not null default false,
  item_type text check (item_type in ('track', 'episode')),
  spotify_item_id text,
  item_name text,
  artist_name text,
  album_name text,
  album_image_url text,
  spotify_url text,
  progress_ms integer check (progress_ms is null or progress_ms >= 0),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  captured_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (care_space_id, user_id)
);

create index spotify_live_shares_space_updated_idx
on public.spotify_live_shares (care_space_id, updated_at desc);

alter table public.spotify_live_shares enable row level security;

create policy "Space members can view Spotify live shares"
on public.spotify_live_shares
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.user_id = (select auth.uid())
      and profiles.care_space_id = spotify_live_shares.care_space_id
  )
);

create policy "Users can create their Spotify live share"
on public.spotify_live_shares
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles
    where profiles.user_id = (select auth.uid())
      and profiles.care_space_id = spotify_live_shares.care_space_id
  )
);

create policy "Users can update their Spotify live share"
on public.spotify_live_shares
for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles
    where profiles.user_id = (select auth.uid())
      and profiles.care_space_id = spotify_live_shares.care_space_id
  )
);

create policy "Users can delete their Spotify live share"
on public.spotify_live_shares
for delete
to authenticated
using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.spotify_live_shares to authenticated;

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'spotify_live_shares'
  ) then
    alter publication supabase_realtime add table public.spotify_live_shares;
  end if;
end;
$$;
