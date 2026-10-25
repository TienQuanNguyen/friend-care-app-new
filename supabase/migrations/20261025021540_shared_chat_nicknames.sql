-- Shared chat-only names. Empty nickname resets to the original profile name.
create table public.chat_nicknames (
  care_space_id uuid not null references public.care_spaces(id) on delete cascade,
  target_user_id uuid not null references public.profiles(user_id) on delete cascade,
  nickname text not null default '' check (char_length(nickname) <= 40 and nickname = btrim(nickname) and nickname !~ '[[:cntrl:]]'),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  primary key (care_space_id, target_user_id)
);
create index chat_nicknames_target_idx on public.chat_nicknames(target_user_id);
create index chat_nicknames_editor_idx on public.chat_nicknames(updated_by);
alter table public.chat_nicknames enable row level security;
revoke all on public.chat_nicknames from anon, authenticated;
grant select, insert, update on public.chat_nicknames to authenticated;
grant all on public.chat_nicknames to service_role;

create policy "Members read shared chat nicknames" on public.chat_nicknames
for select to authenticated
using (care_space_id = public.get_user_care_space_id((select auth.uid())));

create policy "Members set nicknames within their space" on public.chat_nicknames
for insert to authenticated
with check (
  care_space_id = public.get_user_care_space_id((select auth.uid()))
  and updated_by = (select auth.uid())
  and exists (select 1 from public.profiles p where p.user_id = chat_nicknames.target_user_id and p.care_space_id = chat_nicknames.care_space_id)
);

create policy "Members update nicknames within their space" on public.chat_nicknames
for update to authenticated
using (care_space_id = public.get_user_care_space_id((select auth.uid())))
with check (
  care_space_id = public.get_user_care_space_id((select auth.uid()))
  and updated_by = (select auth.uid())
  and exists (select 1 from public.profiles p where p.user_id = chat_nicknames.target_user_id and p.care_space_id = chat_nicknames.care_space_id)
);

alter publication supabase_realtime add table public.chat_nicknames;
