-- 主催者による承認・却下・キャンセル待ちへの移動
--
-- approve:  申請中・キャンセル待ち → 参加確定（満員なら不可）
-- reject:   申請中・キャンセル待ち → 見送り（空いた申請中の枠はキャンセル待ちから繰り上げ）
-- waitlist: 申請中 → キャンセル待ちの最後（満員のときだけ）
create or replace function public.decide_participation(p_participation_id uuid, p_decision text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_event_id uuid;
  v_event public.events;
  v_current public.participations;
  v_approved int;
  v_status text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_decision not in ('approve', 'reject', 'waitlist') then
    raise exception 'invalid_decision';
  end if;

  select event_id into v_event_id from public.participations where id = p_participation_id;
  if v_event_id is null then
    raise exception 'participation_not_found';
  end if;

  select * into v_event from public.events where id = v_event_id for update;
  if v_event.host_id <> v_uid then
    raise exception 'not_host';
  end if;
  if v_event.status <> 'open' then
    raise exception 'event_cancelled';
  end if;
  if v_event.starts_at <= now() then
    raise exception 'event_started';
  end if;

  -- ロックを取ってから読み直す（ロック待ちの間に本人が取り下げた場合など）
  select * into v_current from public.participations where id = p_participation_id for update;

  select count(*) into v_approved
  from public.participations
  where event_id = v_event_id and status = 'approved';

  if p_decision = 'approve' then
    if v_current.status not in ('pending', 'waitlisted') then
      raise exception 'invalid_transition';
    end if;
    if v_approved >= v_event.capacity then
      raise exception 'event_full';
    end if;
    v_status := 'approved';
  elsif p_decision = 'reject' then
    if v_current.status not in ('pending', 'waitlisted') then
      raise exception 'invalid_transition';
    end if;
    v_status := 'rejected';
  else
    if v_current.status <> 'pending' then
      raise exception 'invalid_transition';
    end if;
    if v_approved < v_event.capacity then
      raise exception 'event_not_full';
    end if;
    v_status := 'waitlisted';
  end if;

  update public.participations
  set status = v_status,
      waitlisted_at = case when v_status = 'waitlisted' then clock_timestamp() end,
      has_update = true,
      updated_at = now()
  where id = p_participation_id;

  if v_status = 'rejected' then
    perform public.promote_waitlist(v_event_id);
  end if;

  return v_status;
end
$$;

revoke execute on function public.decide_participation(uuid, text) from public, anon;
grant execute on function public.decide_participation(uuid, text) to authenticated;
