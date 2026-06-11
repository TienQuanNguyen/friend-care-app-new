create table public.daily_interactions (
  id uuid primary key default uuid_generate_v4(),
  care_space_id uuid not null references public.care_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null default (timezone('Asia/Ho_Chi_Minh', now()))::date,
  interaction_count integer not null default 1 check (interaction_count > 0),
  sources text[] not null default '{}'::text[],
  first_interaction_at timestamptz not null default now(),
  last_interaction_at timestamptz not null default now(),
  unique (care_space_id, user_id, activity_date)
);

create index daily_interactions_space_date_idx
on public.daily_interactions (care_space_id, activity_date desc);

alter table public.daily_interactions enable row level security;

create policy "Space members can view daily interactions"
on public.daily_interactions
for select
to authenticated
using (
  care_space_id = get_user_care_space_id((select auth.uid()))
);

grant select on public.daily_interactions to authenticated;

create schema if not exists private;

create or replace function private.record_daily_interaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  space_id uuid;
  source_name text := tg_table_name;
begin
  if actor_id is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    space_id := old.care_space_id;
  else
    space_id := new.care_space_id;
  end if;

  if space_id is null or not exists (
    select 1
    from public.profiles
    where profiles.user_id = actor_id
      and profiles.care_space_id = space_id
  ) then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  insert into public.daily_interactions (
    care_space_id,
    user_id,
    activity_date,
    interaction_count,
    sources,
    first_interaction_at,
    last_interaction_at
  )
  values (
    space_id,
    actor_id,
    (timezone('Asia/Ho_Chi_Minh', now()))::date,
    1,
    array[source_name],
    now(),
    now()
  )
  on conflict (care_space_id, user_id, activity_date)
  do update set
    interaction_count = public.daily_interactions.interaction_count + 1,
    sources = (
      select array_agg(distinct source)
      from unnest(public.daily_interactions.sources || excluded.sources) as source
    ),
    last_interaction_at = now();

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.record_daily_interaction() from public, anon, authenticated;

drop trigger if exists record_mood_entry_interaction on public.mood_entries;
create trigger record_mood_entry_interaction
after insert or update or delete on public.mood_entries
for each row execute function private.record_daily_interaction();

drop trigger if exists record_food_place_interaction on public.food_places;
create trigger record_food_place_interaction
after insert or update or delete on public.food_places
for each row execute function private.record_daily_interaction();

drop trigger if exists record_schedule_interaction on public.schedules;
create trigger record_schedule_interaction
after insert or update or delete on public.schedules
for each row execute function private.record_daily_interaction();

drop trigger if exists record_love_note_interaction on public.love_notes;
create trigger record_love_note_interaction
after insert or update or delete on public.love_notes
for each row execute function private.record_daily_interaction();

drop trigger if exists record_memory_interaction on public.memories;
create trigger record_memory_interaction
after insert or update or delete on public.memories
for each row execute function private.record_daily_interaction();

drop trigger if exists record_profile_interaction on public.profiles;
create trigger record_profile_interaction
after update on public.profiles
for each row execute function private.record_daily_interaction();

do $$
begin
  if to_regclass('public.music_notes') is not null then
    execute 'drop trigger if exists record_music_note_interaction on public.music_notes';
    execute '
      create trigger record_music_note_interaction
      after insert or update or delete on public.music_notes
      for each row execute function private.record_daily_interaction()
    ';
  end if;
end;
$$;

insert into public.daily_interactions (
  care_space_id,
  user_id,
  activity_date,
  interaction_count,
  sources,
  first_interaction_at,
  last_interaction_at
)
select
  activity.care_space_id,
  activity.user_id,
  activity.activity_date,
  count(*)::integer,
  array_agg(distinct activity.source_name),
  min(activity.created_at),
  max(activity.created_at)
from (
  select care_space_id, created_by as user_id,
    (timezone('Asia/Ho_Chi_Minh', created_at))::date as activity_date,
    'mood_entries'::text as source_name, created_at
  from public.mood_entries
  union all
  select care_space_id, created_by,
    (timezone('Asia/Ho_Chi_Minh', created_at))::date,
    'food_places', created_at
  from public.food_places
  union all
  select care_space_id, created_by,
    (timezone('Asia/Ho_Chi_Minh', created_at))::date,
    'schedules', created_at
  from public.schedules
  union all
  select care_space_id, created_by,
    (timezone('Asia/Ho_Chi_Minh', created_at))::date,
    'love_notes', created_at
  from public.love_notes
  union all
  select care_space_id, created_by,
    (timezone('Asia/Ho_Chi_Minh', created_at))::date,
    'memories', created_at
  from public.memories
) activity
group by activity.care_space_id, activity.user_id, activity.activity_date
on conflict (care_space_id, user_id, activity_date)
do update set
  interaction_count = excluded.interaction_count,
  sources = excluded.sources,
  first_interaction_at = excluded.first_interaction_at,
  last_interaction_at = excluded.last_interaction_at;

do $$
begin
  if to_regclass('public.music_notes') is not null then
    execute $music_backfill$
      insert into public.daily_interactions (
        care_space_id,
        user_id,
        activity_date,
        interaction_count,
        sources,
        first_interaction_at,
        last_interaction_at
      )
      select
        care_space_id,
        created_by,
        (timezone('Asia/Ho_Chi_Minh', created_at))::date,
        count(*)::integer,
        array['music_notes']::text[],
        min(created_at),
        max(created_at)
      from public.music_notes
      group by care_space_id, created_by, (timezone('Asia/Ho_Chi_Minh', created_at))::date
      on conflict (care_space_id, user_id, activity_date)
      do update set
        interaction_count = public.daily_interactions.interaction_count + excluded.interaction_count,
        sources = (
          select array_agg(distinct source)
          from unnest(public.daily_interactions.sources || excluded.sources) as source
        ),
        first_interaction_at = least(
          public.daily_interactions.first_interaction_at,
          excluded.first_interaction_at
        ),
        last_interaction_at = greatest(
          public.daily_interactions.last_interaction_at,
          excluded.last_interaction_at
        )
    $music_backfill$;
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'daily_interactions'
  ) then
    execute 'alter publication supabase_realtime add table public.daily_interactions';
  end if;
end;
$$;
