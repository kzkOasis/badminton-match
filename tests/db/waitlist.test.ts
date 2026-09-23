import { describe, expect, it } from "vitest";
import {
  adminClient,
  createEvent,
  createUser,
  dbUrl,
  errorOf,
  insertParticipation,
  userClient,
} from "./helpers";

async function statuses(eventId: string, ids: string[]) {
  const admin = await adminClient();
  const { rows } = await admin.query(
    "select id, status, has_update from public.participations where event_id = $1",
    [eventId],
  );
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)!.status as string);
}

describe.skipIf(!dbUrl)("キャンセル待ちと繰り上げ", () => {
  it("自動承認: キャンセルで先頭のキャンセル待ちが approved になり、変更ありの印が付く", async () => {
    const admin = await adminClient();
    const eventId = await createEvent(admin, await createUser(admin), { capacity: 1 });
    const member = await createUser(admin);
    await insertParticipation(admin, eventId, member, "approved");
    const w1 = await insertParticipation(admin, eventId, await createUser(admin), "waitlisted");
    const w2 = await insertParticipation(admin, eventId, await createUser(admin), "waitlisted");

    await (await userClient(member)).query("select public.cancel_participation($1)", [eventId]);

    expect(await statuses(eventId, [w1, w2])).toEqual(["approved", "waitlisted"]);
    const { rows } = await admin.query("select has_update, waitlisted_at from public.participations where id = $1", [w1]);
    expect(rows[0]).toEqual({ has_update: true, waitlisted_at: null });
  });

  it("承認制: キャンセルで先頭のキャンセル待ちが pending（主催者の対応待ち）になる", async () => {
    const admin = await adminClient();
    const eventId = await createEvent(admin, await createUser(admin), { capacity: 1, requiresApproval: true });
    const member = await createUser(admin);
    await insertParticipation(admin, eventId, member, "approved");
    const w1 = await insertParticipation(admin, eventId, await createUser(admin), "waitlisted");
    const w2 = await insertParticipation(admin, eventId, await createUser(admin), "waitlisted");

    await (await userClient(member)).query("select public.cancel_participation($1)", [eventId]);

    expect(await statuses(eventId, [w1, w2])).toEqual(["pending", "waitlisted"]);
  });

  it("キャンセル待ちの人が取り下げても繰り上げは起きない", async () => {
    const admin = await adminClient();
    const eventId = await createEvent(admin, await createUser(admin), { capacity: 1 });
    const a = await insertParticipation(admin, eventId, await createUser(admin), "approved");
    const leaving = await createUser(admin);
    await insertParticipation(admin, eventId, leaving, "waitlisted");
    const w2 = await insertParticipation(admin, eventId, await createUser(admin), "waitlisted");

    await (await userClient(leaving)).query("select public.cancel_participation($1)", [eventId]);
    expect(await statuses(eventId, [a, w2])).toEqual(["approved", "waitlisted"]);
  });

  it("定員を増やすと、増えた分だけ順番に繰り上がる", async () => {
    const admin = await adminClient();
    const host = await createUser(admin);
    const eventId = await createEvent(admin, host, { capacity: 1 });
    await insertParticipation(admin, eventId, await createUser(admin), "approved");
    const w = [];
    for (let i = 0; i < 3; i++) w.push(await insertParticipation(admin, eventId, await createUser(admin), "waitlisted"));

    await (await userClient(host)).query("update public.events set capacity = 3 where id = $1", [eventId]);
    expect(await statuses(eventId, w)).toEqual(["approved", "approved", "waitlisted"]);
  });

  it("承認制で定員を増やすと、承認待ちの人数も含めて枠の分だけ pending に繰り上がる", async () => {
    const admin = await adminClient();
    const host = await createUser(admin);
    const eventId = await createEvent(admin, host, { capacity: 1, requiresApproval: true });
    await insertParticipation(admin, eventId, await createUser(admin), "approved");
    await insertParticipation(admin, eventId, await createUser(admin), "pending");
    const w = [];
    for (let i = 0; i < 3; i++) w.push(await insertParticipation(admin, eventId, await createUser(admin), "waitlisted"));

    // 枠 3 = 確定1 + 申請中1 + 繰り上げ1
    await (await userClient(host)).query("update public.events set capacity = 3 where id = $1", [eventId]);
    expect(await statuses(eventId, w)).toEqual(["pending", "waitlisted", "waitlisted"]);
  });

  it("中止・開始済みのイベントでは繰り上げない", async () => {
    const admin = await adminClient();
    const host = await createUser(admin);
    const eventId = await createEvent(admin, host, { capacity: 1, status: "cancelled" });
    const w = await insertParticipation(admin, eventId, await createUser(admin), "waitlisted");
    await admin.query("update public.events set capacity = 2 where id = $1", [eventId]);
    expect(await statuses(eventId, [w])).toEqual(["waitlisted"]);
  });

  it("promote_waitlist はクライアントから直接呼べない", async () => {
    const admin = await adminClient();
    const host = await createUser(admin);
    const eventId = await createEvent(admin, host);
    expect(
      await errorOf((await userClient(host)).query("select public.promote_waitlist($1)", [eventId])),
    ).toMatch(/permission denied/);
  });

  it("マイページを開くと変更ありの印が消える（本人の分だけ）", async () => {
    const admin = await adminClient();
    const eventId = await createEvent(admin, await createUser(admin));
    const me = await createUser(admin);
    const other = await createUser(admin);
    const mine = await insertParticipation(admin, eventId, me, "approved");
    const theirs = await insertParticipation(admin, eventId, other, "approved");
    await admin.query("update public.participations set has_update = true where id in ($1, $2)", [mine, theirs]);

    await (await userClient(me)).query("select public.mark_participation_updates_seen()");
    const { rows } = await admin.query(
      "select id, has_update from public.participations where id in ($1, $2)",
      [mine, theirs],
    );
    expect(Object.fromEntries(rows.map((r) => [r.id, r.has_update]))).toEqual({ [mine]: false, [theirs]: true });
  });
});
