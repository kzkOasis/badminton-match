-- イベント・参加・チャットのテーブルと RLS

create table public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null default auth.uid() references public.profiles on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue text not null check (char_length(venue) between 1 and 100),
  area text not null check (char_length(area) between 1 and 50),
  level_min text check (level_min in ('beginner', 'novice', 'intermediate', 'advanced')),
  level_max text check (level_max in ('beginner', 'novice', 'intermediate', 'advanced')),
  capacity int not null check (capacity between 1 and 100),  -- 主催者を含まない募集人数
  fee int not null default 0 check (fee between 0 and 100000),  -- 円・現地払い
  description text check (char_length(description) <= 2000),
  requires_approval boolean not null default true,
  status text not null default 'open' check (status in ('open', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint events_time_order check (ends_at > starts_at),
  constraint events_level_order check (
    level_min is null or level_max is null
    or public.level_rank(level_min) <= public.level_rank(level_max)
  )
);

create index events_open_starts_at_idx on public.events (starts_at) where status = 'open';
create index events_host_id_idx on public.events (host_id);

create table public.participations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  status text not null check (status in ('pending', 'approved', 'waitlisted', 'rejected', 'cancelled')),
  message text check (char_length(message) <= 500),
  waitlisted_at timestamptz,  -- キャンセル待ちの順番
  -- 本人以外（主催者の判断・繰り上げ）で状態が変わり、本人がまだ見ていない
  has_update boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id),
  constraint participations_waitlisted_at check ((status = 'waitlisted') = (waitlisted_at is not null))
);

create index participations_user_id_idx on public.participations (user_id);
create index participations_event_status_idx on public.participations (event_id, status);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index messages_event_created_idx on public.messages (event_id, created_at desc);

-- ---------------------------------------------------------------------------
-- ヘルパー
-- ---------------------------------------------------------------------------

-- チャットのメンバー（主催者＋参加確定者）か
create or replace function public.is_event_member(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id and e.host_id = (select auth.uid())
  ) or exists (
    select 1 from public.participations p
    where p.event_id = p_event_id and p.user_id = (select auth.uid()) and p.status = 'approved'
  )
$$;

create or replace function public.is_event_host(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id and e.host_id = (select auth.uid())
  )
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.events enable row level security;
alter table public.participations enable row level security;
alter table public.messages enable row level security;

-- events: 誰でも読める。作成はログインユーザー、更新は主催者のみ。削除はしない（中止にする）
create policy "events: 誰でも読める"
  on public.events for select
  to anon, authenticated
  using (true);

create policy "events: ログインユーザーは自分が主催者のイベントを作れる"
  on public.events for insert
  to authenticated
  with check (host_id = (select auth.uid()));

create policy "events: 主催者だけ更新できる"
  on public.events for update
  to authenticated
  using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()));

revoke insert, update, delete on public.events from anon;
revoke delete on public.events from authenticated;

-- participations: 本人と、そのイベントの主催者が読める。書き込みは関数経由のみ
create policy "participations: 本人と主催者が読める"
  on public.participations for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_event_host(event_id));

revoke all on public.participations from anon;
revoke insert, update, delete on public.participations from authenticated;

-- messages: 主催者と参加確定者が読める。中止されていないイベントにだけ投稿できる
create policy "messages: メンバーが読める"
  on public.messages for select
  to authenticated
  using (public.is_event_member(event_id));

create policy "messages: メンバーが中止されていないイベントに投稿できる"
  on public.messages for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_event_member(event_id)
    and exists (select 1 from public.events e where e.id = event_id and e.status = 'open')
  );

revoke all on public.messages from anon;
revoke update, delete on public.messages from authenticated;

-- ---------------------------------------------------------------------------
-- 公開用の集計
-- ---------------------------------------------------------------------------

-- イベント＋参加確定数・キャンセル待ち数。participations の中身は出さず件数だけを返す。
-- 件数を誰でも見られるように、ビューの所有者権限で participations を数える
create view public.event_summaries
with (security_invoker = false)
as
select
  e.*,
  coalesce(c.approved_count, 0) as approved_count,
  coalesce(c.waitlist_count, 0) as waitlist_count
from public.events e
left join lateral (
  select
    count(*) filter (where p.status = 'approved')::int as approved_count,
    count(*) filter (where p.status = 'waitlisted')::int as waitlist_count
  from public.participations p
  where p.event_id = e.id
) c on true;

revoke all on public.event_summaries from anon, authenticated;
grant select on public.event_summaries to anon, authenticated;

-- 参加者一覧（主催者＋参加確定者）。メンバーにだけ返す
create or replace function public.event_members(p_event_id uuid)
returns table (user_id uuid, display_name text, level text, is_host boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select pr.id, pr.display_name, pr.level, true
  from public.events e
  join public.profiles pr on pr.id = e.host_id
  where e.id = p_event_id and public.is_event_member(p_event_id)
  union all
  select pr.id, pr.display_name, pr.level, false
  from public.participations p
  join public.profiles pr on pr.id = p.user_id
  where p.event_id = p_event_id and p.status = 'approved' and public.is_event_member(p_event_id)
$$;

-- 各イベントの最新メッセージ時刻（呼び出したユーザーの権限で、読めるものだけ）
create or replace function public.latest_message_times(p_event_ids uuid[])
returns table (event_id uuid, last_message_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select m.event_id, max(m.created_at)
  from public.messages m
  where m.event_id = any (p_event_ids)
  group by m.event_id
$$;

-- 関数の実行権限は既定で PUBLIC にも付くので、PUBLIC から外してから付け直す
revoke execute on function public.event_members(uuid) from public, anon;
revoke execute on function public.latest_message_times(uuid[]) from public, anon;
revoke execute on function public.is_event_member(uuid) from public, anon;
revoke execute on function public.is_event_host(uuid) from public, anon;
grant execute on function public.event_members(uuid) to authenticated;
grant execute on function public.latest_message_times(uuid[]) to authenticated;
grant execute on function public.is_event_member(uuid) to authenticated;
grant execute on function public.is_event_host(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- イベント更新時のガード
-- ---------------------------------------------------------------------------

create or replace function public.events_guard_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_approved int;
begin
  if new.host_id <> old.host_id then
    raise exception 'host_immutable';
  end if;
  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'event_cancelled';
  end if;
  if new.capacity < old.capacity then
    -- UPDATE がイベント行をロックしているので、申込関数と並行して数がずれることはない
    select count(*) into v_approved
    from public.participations
    where event_id = new.id and status = 'approved';
    if new.capacity < v_approved then
      raise exception 'capacity_below_approved';
    end if;
  end if;
  return new;
end
$$;

revoke execute on function public.events_guard_update() from public, anon, authenticated;

create trigger events_guard_update
  before update on public.events
  for each row execute function public.events_guard_update();

-- チャットの Realtime 配信（RLS が適用される）
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;
