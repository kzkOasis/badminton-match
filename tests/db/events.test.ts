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

describe.skipIf(!dbUrl)("events", () => {
  it("未ログインでもイベントと件数（参加確定・キャンセル待ち）を読める", async () => {
    const admin = await adminClient();
    const host = await createUser(admin);
    const eventId = await createEvent(admin, host, { capacity: 1 });
    await insertParticipation(admin, eventId, await createUser(admin), "approved");
    await insertParticipation(admin, eventId, await createUser(admin), "waitlisted");
    await insertParticipation(admin, eventId, await createUser(admin), "pending");

    const anon = await anonClient();
    const { rows } = await anon.query(
      "select approved_count, waitlist_count from public.event_summaries where id = $1",
      [eventId],
    );
    expect(rows).toEqual([{ approved_count: 1, waitlist_count: 1 }]);
    // 参加者の中身は読めない
    expect(await errorOf(anon.query("select * from public.participations"))).toMatch(/permission denied/);
  });

  it("ログインユーザーは自分が主催者のイベントだけ作れる", async () => {
    const admin = await adminClient();
    const me = await createUser(admin);
    const other = await createUser(admin);
    const client = await userClient(me);

    const { rows } = await client.query(
      `insert into public.events (title, starts_at, ends_at, venue, area, capacity)
       values ('朝練', now() + interval '1 day', now() + interval '1 day 2 hours', '体育館', '東京都', 4)
       returning host_id, requires_approval, status`,
    );
    expect(rows[0]).toEqual({ host_id: me, requires_approval: true, status: "open" });

    expect(
      await errorOf(
        client.query(
          `insert into public.events (host_id, title, starts_at, ends_at, venue, area, capacity)
           values ($1, 'なりすまし', now() + interval '1 day', now() + interval '1 day 2 hours', '体育館', '東京都', 4)`,
          [other],
        ),
      ),
    ).toMatch(/row-level security/);

    const anon = await anonClient();
    expect(
      await errorOf(
        anon.query(
          `insert into public.events (host_id, title, starts_at, ends_at, venue, area, capacity)
           values ($1, 'x', now(), now() + interval '1 hour', 'x', 'x', 1)`,
          [me],
        ),
      ),
    ).toMatch(/permission denied/);
  });

  it("主催者以外はイベントを更新できない", async () => {
    const admin = await adminClient();
    const host = await createUser(admin);
    const eventId = await createEvent(admin, host);
    const other = await userClient(await createUser(admin));

    const res = await other.query("update public.events set title = '乗っ取り' where id = $1", [eventId]);
    expect(res.rowCount).toBe(0);

    const hostClient = await userClient(host);
    const ok = await hostClient.query("update public.events set title = '変更後' where id = $1", [eventId]);
    expect(ok.rowCount).toBe(1);
  });

  it("定員は現在の参加確定数より小さくできない", async () => {
    const admin = await adminClient();
    const host = await createUser(admin);
    const eventId = await createEvent(admin, host, { capacity: 3 });
    await insertParticipation(admin, eventId, await createUser(admin), "approved");
    await insertParticipation(admin, eventId, await createUser(admin), "approved");
    const hostClient = await userClient(host);

    expect(
      await errorOf(hostClient.query("update public.events set capacity = 1 where id = $1", [eventId])),
    ).toMatch(/capacity_below_approved/);
    const ok = await hostClient.query("update public.events set capacity = 2 where id = $1", [eventId]);
    expect(ok.rowCount).toBe(1);
  });

  it("中止したイベントは再開できず、主催者も付け替えられない", async () => {
    const admin = await adminClient();
    const host = await createUser(admin);
    const eventId = await createEvent(admin, host);
    const hostClient = await userClient(host);

    await hostClient.query("update public.events set status = 'cancelled' where id = $1", [eventId]);
    expect(
      await errorOf(hostClient.query("update public.events set status = 'open' where id = $1", [eventId])),
    ).toMatch(/event_cancelled/);
  });

  it("終了時刻は開始時刻より後", async () => {
    const admin = await adminClient();
    const client = await userClient(await createUser(admin));
    expect(
      await errorOf(
        client.query(
          `insert into public.events (title, starts_at, ends_at, venue, area, capacity)
           values ('x', now() + interval '2 hours', now() + interval '1 hour', 'x', 'x', 1)`,
        ),
      ),
    ).toMatch(/events_time_order/);
  });
});

describe.skipIf(!dbUrl)("participations の RLS", () => {
  it("本人と主催者だけが読める", async () => {
    const admin = await adminClient();
    const host = await createUser(admin);
    const alice = await createUser(admin);
    const bob = await createUser(admin);
    const eventId = await createEvent(admin, host);
    await insertParticipation(admin, eventId, alice, "pending");
    await insertParticipation(admin, eventId, bob, "approved");

    const aliceRows = (await (await userClient(alice)).query("select user_id from public.participations where event_id = $1", [eventId])).rows;
    expect(aliceRows.map((r) => r.user_id)).toEqual([alice]);

    const hostRows = (await (await userClient(host)).query("select user_id from public.participations where event_id = $1", [eventId])).rows;
    expect(hostRows.map((r) => r.user_id).sort()).toEqual([alice, bob].sort());
  });

  it("直接の書き込みはできない（関数経由のみ）", async () => {
    const admin = await adminClient();
    const host = await createUser(admin);
    const alice = await createUser(admin);
    const eventId = await createEvent(admin, host);
    const pid = await insertParticipation(admin, eventId, alice, "pending");

    const aliceClient = await userClient(alice);
    expect(
      await errorOf(
        aliceClient.query(
          "insert into public.participations (event_id, user_id, status) values ($1, $2, 'approved')",
          [eventId, alice],
        ),
      ),
    ).toMatch(/permission denied/);

    const hostClient = await userClient(host);
    expect(
      await errorOf(hostClient.query("update public.participations set status = 'approved' where id = $1", [pid])),
    ).toMatch(/permission denied/);
  });
});

describe.skipIf(!dbUrl)("messages の RLS", () => {
  async function setup() {
    const admin = await adminClient();
    const host = await createUser(admin);
    const approved = await createUser(admin);
    const pending = await createUser(admin);
    const rejected = await createUser(admin);
    const stranger = await createUser(admin);
    const eventId = await createEvent(admin, host, { requiresApproval: true });
    await insertParticipation(admin, eventId, approved, "approved");
    await insertParticipation(admin, eventId, pending, "pending");
    await insertParticipation(admin, eventId, rejected, "rejected");
    await admin.query("insert into public.messages (event_id, user_id, body) values ($1, $2, 'よろしく')", [
      eventId,
      host,
    ]);
    return { admin, host, approved, pending, rejected, stranger, eventId };
  }

  it("主催者と参加確定者だけが読める。申請中・却下・無関係の人は読めない", async () => {
    const { host, approved, pending, rejected, stranger, eventId } = await setup();
    const count = async (uid: string) =>
      (await (await userClient(uid)).query("select count(*)::int as n from public.messages where event_id = $1", [eventId])).rows[0].n;

    expect(await count(host)).toBe(1);
    expect(await count(approved)).toBe(1);
    expect(await count(pending)).toBe(0);
    expect(await count(rejected)).toBe(0);
    expect(await count(stranger)).toBe(0);

    const anon = await anonClient();
    expect(await errorOf(anon.query("select * from public.messages"))).toMatch(/permission denied/);
  });

  it("キャンセルした人は以降読めない", async () => {
    const { admin, approved, eventId } = await setup();
    await admin.query("update public.participations set status = 'cancelled' where event_id = $1 and user_id = $2", [
      eventId,
      approved,
    ]);
    const { rows } = await (await userClient(approved)).query(
      "select count(*)::int as n from public.messages where event_id = $1",
      [eventId],
    );
    expect(rows[0].n).toBe(0);
  });

  it("メンバーだけが投稿でき、他人になりすませない", async () => {
    const { host, approved, pending, eventId } = await setup();
    const approvedClient = await userClient(approved);
    await approvedClient.query("insert into public.messages (event_id, body) values ($1, '参加します')", [eventId]);

    expect(
      await errorOf(
        (await userClient(pending)).query("insert into public.messages (event_id, body) values ($1, 'x')", [eventId]),
      ),
    ).toMatch(/row-level security/);
    expect(
      await errorOf(
        approvedClient.query("insert into public.messages (event_id, user_id, body) values ($1, $2, 'x')", [
          eventId,
          host,
        ]),
      ),
    ).toMatch(/row-level security/);
  });

  it("中止されたイベントには投稿できないが、読むことはできる", async () => {
    const { admin, approved, eventId } = await setup();
    await admin.query("update public.events set status = 'cancelled' where id = $1", [eventId]);
    const client = await userClient(approved);
    expect(
      await errorOf(client.query("insert into public.messages (event_id, body) values ($1, 'x')", [eventId])),
    ).toMatch(/row-level security/);
    const { rows } = await client.query("select count(*)::int as n from public.messages where event_id = $1", [eventId]);
    expect(rows[0].n).toBe(1);
  });

  it("開催後もメンバーは投稿できる", async () => {
    const admin = await adminClient();
    const host = await createUser(admin);
    const eventId = await createEvent(admin, host, { startsInHours: -5 });
    const client = await userClient(host);
    const res = await client.query("insert into public.messages (event_id, body) values ($1, 'おつかれさま')", [eventId]);
    expect(res.rowCount).toBe(1);
  });

  it("参加者一覧はメンバーにだけ返る", async () => {
    const { host, approved, pending, eventId } = await setup();
    const members = async (uid: string) =>
      (await (await userClient(uid)).query("select user_id, is_host from public.event_members($1)", [eventId])).rows;

    expect(await members(approved)).toEqual(
      expect.arrayContaining([
        { user_id: host, is_host: true },
        { user_id: approved, is_host: false },
      ]),
    );
    expect(await members(pending)).toEqual([]);

    const anon = await anonClient();
    expect(await errorOf(anon.query("select * from public.event_members($1)", [eventId]))).toMatch(
      /permission denied/,
    );
  });
});
