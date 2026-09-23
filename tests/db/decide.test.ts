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

async function decide(uid: string, participationId: string, decision: string) {
  const c = await userClient(uid);
  const { rows } = await c.query("select public.decide_participation($1, $2) as s", [
    participationId,
    decision,
  ]);
  return rows[0].s as string;
}

async function row(id: string) {
  const admin = await adminClient();
  const { rows } = await admin.query(
    "select status, has_update, waitlisted_at from public.participations where id = $1",
    [id],
  );
  return rows[0];
}

describe.skipIf(!dbUrl)("decide_participation", () => {
  it("主催者は申請中を承認できる（本人に変更ありの印が付く）", async () => {
    const admin = await adminClient();
    const host = await createUser(admin);
    const eventId = await createEvent(admin, host, { capacity: 2, requiresApproval: true });
    const pid = await insertParticipation(admin, eventId, await createUser(admin), "pending");
    expect(await decide(host, pid, "approve")).toBe("approved");
    expect(await row(pid)).toMatchObject({ status: "approved", has_update: true });
  });

  it("満員のときは承認できず、キャンセル待ちに回せる", async () => {
    const admin = await adminClient();
    const host = await createUser(admin);
    const eventId = await createEvent(admin, host, { capacity: 1, requiresApproval: true });
    await insertParticipation(admin, eventId, await createUser(admin), "approved");
    const pid = await insertParticipation(admin, eventId, await createUser(admin), "pending");

    expect(await errorOf(decide(host, pid, "approve"))).toMatch(/event_full/);
    expect(await decide(host, pid, "waitlist")).toBe("waitlisted");
    const r = await row(pid);
    expect(r.status).toBe("waitlisted");
    expect(r.waitlisted_at).not.toBeNull();
  });

  it("空きがあるときはキャンセル待ちに回せない", async () => {
    const admin = await adminClient();
    const host = await createUser(admin);
    const eventId = await createEvent(admin, host, { capacity: 2, requiresApproval: true });
    const pid = await insertParticipation(admin, eventId, await createUser(admin), "pending");
    expect(await errorOf(decide(host, pid, "waitlist"))).toMatch(/event_not_full/);
  });

  it("主催者以外は承認・却下できない（申込者本人も）", async () => {
    const admin = await adminClient();
    const host = await createUser(admin);
    const applicant = await createUser(admin);
    const eventId = await createEvent(admin, host, { requiresApproval: true });
    const pid = await insertParticipation(admin, eventId, applicant, "pending");
    expect(await errorOf(decide(applicant, pid, "approve"))).toMatch(/not_host/);
    expect(await errorOf(decide(await createUser(admin), pid, "reject"))).toMatch(/not_host/);
    expect((await row(pid)).status).toBe("pending");
  });

  it("却下すると、空いた申請枠にキャンセル待ちの先頭が繰り上がる（承認制なので pending）", async () => {
    const admin = await adminClient();
    const host = await createUser(admin);
    const eventId = await createEvent(admin, host, { capacity: 2, requiresApproval: true });
    await insertParticipation(admin, eventId, await createUser(admin), "approved");
    const pending = await insertParticipation(admin, eventId, await createUser(admin), "pending");
    const w1 = await insertParticipation(admin, eventId, await createUser(admin), "waitlisted");
    const w2 = await insertParticipation(admin, eventId, await createUser(admin), "waitlisted");

    expect(await decide(host, pending, "reject")).toBe("rejected");
    expect((await row(w1)).status).toBe("pending");
    expect((await row(w2)).status).toBe("waitlisted");
  });

  it("確定済み・却下済み・キャンセル済みには使えない", async () => {
    const admin = await adminClient();
    const host = await createUser(admin);
    const eventId = await createEvent(admin, host, { capacity: 5, requiresApproval: true });
    for (const status of ["approved", "rejected", "cancelled"]) {
      const pid = await insertParticipation(admin, eventId, await createUser(admin), status);
      expect(await errorOf(decide(host, pid, "approve"))).toMatch(/invalid_transition/);
    }
    const pid = await insertParticipation(admin, eventId, await createUser(admin), "pending");
    expect(await errorOf(decide(host, pid, "delete"))).toMatch(/invalid_decision/);
  });

  it("中止・開始済みのイベントでは操作できない", async () => {
    const admin = await adminClient();
    const host = await createUser(admin);
    const cancelled = await createEvent(admin, host, { requiresApproval: true, status: "cancelled" });
    const started = await createEvent(admin, host, { requiresApproval: true, startsInHours: -1 });
    const p1 = await insertParticipation(admin, cancelled, await createUser(admin), "pending");
    const p2 = await insertParticipation(admin, started, await createUser(admin), "pending");
    expect(await errorOf(decide(host, p1, "approve"))).toMatch(/event_cancelled/);
    expect(await errorOf(decide(host, p2, "approve"))).toMatch(/event_started/);
  });

  it("同時に2件承認しても定員を超えない", async () => {
    const admin = await adminClient();
    const host = await createUser(admin);
    const eventId = await createEvent(admin, host, { capacity: 1, requiresApproval: true });
    const p1 = await insertParticipation(admin, eventId, await createUser(admin), "pending");
    const p2 = await insertParticipation(admin, eventId, await createUser(admin), "pending");
    const results = await Promise.allSettled([decide(host, p1, "approve"), decide(host, p2, "approve")]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const { rows } = await admin.query(
      "select count(*)::int as n from public.participations where event_id = $1 and status = 'approved'",
      [eventId],
    );
    expect(rows[0].n).toBe(1);
  });
});
