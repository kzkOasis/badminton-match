-- プロフィール（auth.users と 1対1）

create or replace function public.level_rank(p_level text)
returns int
language sql
immutable
set search_path = ''
as $$
  select case p_level
    when 'beginner' then 1
    when 'novice' then 2
    when 'intermediate' then 3
    when 'advanced' then 4
  end
$$;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 30),
  level text not null check (level in ('beginner', 'novice', 'intermediate', 'advanced')),
  area text check (char_length(area) <= 50),
  bio text check (char_length(bio) <= 500),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy profiles_select_authenticated
  on public.profiles for select
  to authenticated
  using (true);

create policy profiles_insert_own
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke all on public.profiles from anon;
revoke delete on public.profiles from authenticated;
