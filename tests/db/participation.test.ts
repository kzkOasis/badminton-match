import { describe, expect, it } from "vitest";
import {
  adminClient,
  anonClient,
  createEvent,
  createUser,
  dbUrl,
  errorOf,
  insertParticipation,
  userClient,
} from "./helpers";

async function apply(uid: string, eventId: string, message: string | null = null) {
  const c = await userClient(uid);
  const { rows } = await c.query("select public.apply_to_event($1, $2) as status", [eventId, message]);
  return rows[0].status as string;
}

async function cancel(uid: string, eventId: string) {
  const c = await userClient(uid);
  await c.query("select public.cancel_participation($1)", [eventId]);
}

async function statusOf(eventId: string, uid: string) {
  const admin = await adminClient();
  const { rows } = await admin.query(
    "select status from public.participations where event_id = $1 and user_id = $2",
    [eventId, uid],
  );
  return rows[0]?.status as string | undefined;
}

describe.skipIf(!dbUrl)("apply_to_event", () => {
  it("空きあり・自動承認 → approved、満員 → waitlisted", async () => {
    const admin = await adminClient();
    const eventId = await createEvent(admin, await createUser(admin), { capacity: 1 });
    expect(await apply(await createUser(admin), eventId, "よろしくお願いします")).toBe("approved");
    expect(await apply(await createUser(admin), eventId)).toBe("waitlisted");
  });

  it("空きあり・承認制 → pending（pending は定員に数えない）", async () => {
    const admin = await adminClient();
    const eventId = await createEvent(admin, await createUser(admin), {
      capacity: 1,
      requiresApproval: true,
    });
    expect(await apply(await createUser(admin), eventId)).toBe("pending");
    expect(await apply(await createUser(admin), eventId)).toBe("pending");
  });

  it("キャンセル待ちの人がいれば、空きがあっても後ろに並ぶ", async () => {
    const admin = await adminClient();
    const eventId = await createEvent(admin, await createUser(admin), { capacity: 2, requiresApproval: true });
    await insertParticipation(admin, eventId, await createUser(admin), "approved");
    await insertParticipation(admin, eventId, await createUser(admin), "waitlisted");
    expect(await apply(await createUser(admin), eventId)).toBe("waitlisted");
  });

  it("申込メッセージを保存する", async () => {
    const admin = await adminClient();
    const eventId = await createEvent(admin, await createUser(admin));
    const uid = await createUser(admin);
    await apply(uid, eventId, "  初参加です  ");
    const { rows } = await admin.query("select message from public.participations where user_id = $1", [uid]);
    expect(rows[0].message).toBe("初参加です");
  });

  it("主催者自身・二重申込・却下された人は申し込めない", async () => {
    const admin = await adminClient();
    const host = await createUser(admin);
    const eventId = await createEvent(admin, host);
    expect(await errorOf(apply(host, eventId))).toMatch(/host_cannot_apply/);

    const uid = await createUser(admin);
    await apply(uid, eventId);
    expect(await errorOf(apply(uid, eventId))).toMatch(/already_applied/);

    const rejected = await createUser(admin);
    await insertParticipation(admin, eventId, rejected, "rejected");
    expect(await errorOf(apply(rejected, eventId))).toMatch(/rejected/);
  });

  it("中止・開始済みのイベントには申し込めない", async () => {
    const admin = await adminClient();
    const host = await createUser(admin);
    const cancelled = await createEvent(admin, host, { status: "cancelled" });
    const started = await createEvent(admin, host, { startsInHours: -1 });
    const uid = await createUser(admin);
    expect(await errorOf(apply(uid, cancelled))).toMatch(/event_cancelled/);
    expect(await errorOf(apply(uid, started))).toMatch(/event_started/);
  });

  it("プロフィール未登録・未ログインでは申し込めない", async () => {
    const admin = await adminClient();
    const eventId = await createEvent(admin, await createUser(admin));
    const noProfile = await createUser(admin, { withProfile: false });
    expect(await errorOf(apply(noProfile, eventId))).toMatch(/profile_required/);

    const anon = await anonClient();
    expect(await errorOf(anon.query("select public.apply_to_event($1, null)", [eventId]))).toMatch(
      /permission denied/,
    );
  });

  it("キャンセル後は同じ行を使って再申込できる", async () => {
    const admin = await adminClient();
    const eventId = await createEvent(admin, await createUser(admin));
    const uid = await createUser(admin);
    await apply(uid, eventId);
    await cancel(uid, eventId);
    expect(await statusOf(eventId, uid)).toBe("cancelled");
    expect(await apply(uid, eventId)).toBe("approved");
    const { rows } = await admin.query("select count(*)::int as n from public.participations where user_id = $1", [uid]);
    expect(rows[0].n).toBe(1);
  });
});

describe.skipIf(!dbUrl)("cancel_participation", () => {
  it("参加確定・申請中・キャンセル待ちから取り消せる", async () => {
    const admin = await adminClient();
    const eventId = await createEvent(admin, await createUser(admin), { capacity: 5 });
    for (const status of ["approved", "pending", "waitlisted"]) {
      const uid = await createUser(admin);
      await insertParticipation(admin, eventId, uid, status);
      await cancel(uid, eventId);
      expect(await statusOf(eventId, uid)).toBe("cancelled");
    }
  });

  it("申し込んでいない・却下済みならエラー", async () => {
    const admin = await adminClient();
    const eventId = await createEvent(admin, await createUser(admin));
    expect(await errorOf(cancel(await createUser(admin), eventId))).toMatch(/not_participating/);
    const rejected = await createUser(admin);
    await insertParticipation(admin, eventId, rejected, "rejected");
    expect(await errorOf(cancel(rejected, eventId))).toMatch(/not_participating/);
  });

  it("中止・開始済みのイベントはキャンセルできない", async () => {
    const admin = await adminClient();
    const host = await createUser(admin);
    const uid = await createUser(admin);
    const cancelled = await createEvent(admin, host, { status: "cancelled" });
    const started = await createEvent(admin, host, { startsInHours: -1 });
    await insertParticipation(admin, cancelled, uid, "approved");
    await insertParticipation(admin, started, uid, "approved");
    expect(await errorOf(cancel(uid, cancelled))).toMatch(/event_cancelled/);
    expect(await errorOf(cancel(uid, started))).toMatch(/event_started/);
  });
});

describe.skipIf(!dbUrl)("同時申込", () => {
  it("残り1枠に2人が同時に申し込んでも、後の人はキャンセル待ちになる", async () => {
    const admin = await adminClient();
    const eventId = await createEvent(admin, await createUser(admin), { capacity: 2 });
    await insertParticipation(admin, eventId, await createUser(admin), "approved");
    const a = await userClient(await createUser(admin));
    const b = await userClient(await createUser(admin));

    await a.query("begin");
    await b.query("begin");
    const ra = await a.query("select public.apply_to_event($1, null) as s", [eventId]);
    // b は a のロック解放を待つ
    const pb = b.query("select public.apply_to_event($1, null) as s", [eventId]);
    await expect
      .poll(async () => {
        const { rows } = await admin.query(
          "select count(*)::int as n from pg_stat_activity where wait_event_type = 'Lock' and query like '%apply_to_event%'",
        );
        return rows[0].n;
      })
      .toBe(1);
    await a.query("commit");
    const rb = await pb;
    await b.query("commit");

    expect(ra.rows[0].s).toBe("approved");
    expect(rb.rows[0].s).toBe("waitlisted");
  });

  it("多人数が一斉に申し込んでも approved は定員を超えない", async () => {
    const admin = await adminClient();
    const eventId = await createEvent(admin, await createUser(admin), { capacity: 3 });
    const users: string[] = [];
    for (let i = 0; i < 10; i++) users.push(await createUser(admin));
    const clients = await Promise.all(users.map((u) => userClient(u)));
    const results = await Promise.all(
      clients.map((c) => c.query("select public.apply_to_event($1, null) as s", [eventId])),
    );
    const statuses = results.map((r) => r.rows[0].s);
    expect(statuses.filter((s) => s === "approved")).toHaveLength(3);
    expect(statuses.filter((s) => s === "waitlisted")).toHaveLength(7);

    const { rows } = await admin.query(
      "select approved_count, waitlist_count from public.event_summaries where id = $1",
      [eventId],
    );
    expect(rows[0]).toEqual({ approved_count: 3, waitlist_count: 7 });
  });
});

describe.skipIf(!dbUrl)("my_waitlist_position", () => {
  it("キャンセル待ちの順番を返す", async () => {
    const admin = await adminClient();
    const eventId = await createEvent(admin, await createUser(admin), { capacity: 1 });
    await apply(await createUser(admin), eventId);
    const first = await createUser(admin);
    const second = await createUser(admin);
    await apply(first, eventId);
    await apply(second, eventId);
    const pos = async (uid: string) =>
      (await (await userClient(uid)).query("select public.my_waitlist_position($1) as n", [eventId])).rows[0].n;
    expect(await pos(first)).toBe(1);
    expect(await pos(second)).toBe(2);
    expect(await pos(await createUser(admin))).toBeNull();
  });
});
