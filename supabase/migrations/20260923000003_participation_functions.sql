-- 参加申込・キャンセル・繰り上げ
--
-- 参加状態はクライアントから直接書き換えず、この関数だけで変える。
-- どの関数も最初に対象イベントの行を select ... for update でロックしてから件数を数えるので、
-- 同時に申し込まれても参加確定（approved）が定員を超えない。

-- キャンセル待ちの先頭から、空きの分だけ繰り上げる（内部用。イベント行のロックを持った状態で呼ぶ）
-- 自動承認: approved が定員に達するまで approved にする
-- 承認制:   approved + pending が定員に達するまで pending にする（主催者の承認待ち）
create or replace function public.promote_waitlist(p_event_id uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events;
  v_approved int;
  v_pending int;
  v_next uuid;
  v_promoted int := 0;
begin
  select * into v_event from public.events where id = p_event_id for update;
  if not found or v_event.status <> 'open' or v_event.starts_at <= now() then
    return 0;
  end if;

  loop
    select
      count(*) filter (where status = 'approved'),
      count(*) filter (where status = 'pending')
    into v_approved, v_pending
    from public.participations
    where event_id = p_event_id;

    if v_event.requires_approval then
      exit when v_approved + v_pending >= v_event.capacity;
    else
      exit when v_approved >= v_event.capacity;
    end if;

    select id into v_next
    from public.participations
    where event_id = p_event_id and status = 'waitlisted'
    order by waitlisted_at, created_at
    limit 1;
    exit when v_next is null;

    update public.participations
    set status = case when v_event.requires_approval then 'pending' else 'approved' end,
        waitlisted_at = null,
        has_update = true,
        updated_at = now()
    where id = v_next;

    v_promoted := v_promoted + 1;
  end loop;

  return v_promoted;
end
$$;

-- 申し込む。戻り値は申込後の状態（'approved' | 'pending' | 'waitlisted'）
create or replace function public.apply_to_event(p_event_id uuid, p_message text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_event public.events;
  v_current public.participations;
  v_approved int;
  v_has_waitlist boolean;
  v_status text;
  v_message text := nullif(btrim(p_message), '');
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'profile_required';
  end if;

  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'event_not_found';
  end if;
  if v_event.host_id = v_uid then
    raise exception 'host_cannot_apply';
  end if;
  if v_event.status <> 'open' then
    raise exception 'event_cancelled';
  end if;
  if v_event.starts_at <= now() then
    raise exception 'event_started';
  end if;

  select * into v_current
  from public.participations
  where event_id = p_event_id and user_id = v_uid;
  if found then
    if v_current.status in ('pending', 'approved', 'waitlisted') then
      raise exception 'already_applied';
    elsif v_current.status = 'rejected' then
      raise exception 'rejected';
    end if;
  end if;

  select
    count(*) filter (where status = 'approved'),
    bool_or(status = 'waitlisted')
  into v_approved, v_has_waitlist
  from public.participations
  where event_id = p_event_id;

  -- 満員、またはすでにキャンセル待ちの人がいるなら、順番を守ってキャンセル待ちの最後に並ぶ
  if v_approved >= v_event.capacity or coalesce(v_has_waitlist, false) then
    v_status := 'waitlisted';
  elsif v_event.requires_approval then
    v_status := 'pending';
  else
    v_status := 'approved';
  end if;

  insert into public.participations (event_id, user_id, status, message, waitlisted_at)
  values (
    p_event_id, v_uid, v_status, v_message,
    case when v_status = 'waitlisted' then clock_timestamp() end
  )
  on conflict (event_id, user_id) do update
  set status = excluded.status,
      message = excluded.message,
      waitlisted_at = excluded.waitlisted_at,
      has_update = false,
      updated_at = now();

  return v_status;
end
$$;

-- 自分の申し込みをキャンセル・取り下げる。参加確定・申請中の枠が空いたら繰り上げる
create or replace function public.cancel_participation(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_event public.events;
  v_current public.participations;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'event_not_found';
  end if;
  if v_event.status <> 'open' then
    raise exception 'event_cancelled';
  end if;
  if v_event.starts_at <= now() then
    raise exception 'event_started';
  end if;

  select * into v_current
  from public.participations
  where event_id = p_event_id and user_id = v_uid
  for update;
  if not found or v_current.status not in ('pending', 'approved', 'waitlisted') then
    raise exception 'not_participating';
  end if;

  update public.participations
  set status = 'cancelled', waitlisted_at = null, has_update = false, updated_at = now()
  where id = v_current.id;

  if v_current.status in ('approved', 'pending') then
    perform public.promote_waitlist(p_event_id);
  end if;
end
$$;

-- 主催者の判断や繰り上げで変わった状態を「見た」にする（マイページを開いたとき）
create or replace function public.mark_participation_updates_seen()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.participations
  set has_update = false
  where user_id = auth.uid() and has_update;
$$;

-- 自分がキャンセル待ちの何番目か（キャンセル待ちでなければ null）
create or replace function public.my_waitlist_position(p_event_id uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select (
    select count(*)::int + 1
    from public.participations o
    where o.event_id = p_event_id
      and o.status = 'waitlisted'
      and (o.waitlisted_at, o.created_at) < (me.waitlisted_at, me.created_at)
  )
  from public.participations me
  where me.event_id = p_event_id and me.user_id = auth.uid() and me.status = 'waitlisted'
$$;

-- 定員を増やしたら、キャンセル待ちを繰り上げる
create or replace function public.events_promote_on_capacity_increase()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.capacity > old.capacity then
    perform public.promote_waitlist(new.id);
  end if;
  return null;
end
$$;

create trigger events_promote_on_capacity_increase
  after update of capacity on public.events
  for each row execute function public.events_promote_on_capacity_increase();

revoke execute on function public.promote_waitlist(uuid) from public, anon, authenticated;
revoke execute on function public.events_promote_on_capacity_increase() from public, anon, authenticated;
revoke execute on function public.apply_to_event(uuid, text) from public, anon;
revoke execute on function public.cancel_participation(uuid) from public, anon;
revoke execute on function public.mark_participation_updates_seen() from public, anon;
revoke execute on function public.my_waitlist_position(uuid) from public, anon;
grant execute on function public.my_waitlist_position(uuid) to authenticated;
grant execute on function public.apply_to_event(uuid, text) to authenticated;
grant execute on function public.cancel_participation(uuid) to authenticated;
grant execute on function public.mark_participation_updates_seen() to authenticated;
