import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, inject } from "vitest";

export const dbUrl = inject("dbUrl");

const clients: pg.Client[] = [];

afterAll(async () => {
  await Promise.all(clients.splice(0).map((c) => c.end()));
});

async function connect(): Promise<pg.Client> {
  const c = new pg.Client({ connectionString: dbUrl! });
  await c.connect();
  clients.push(c);
  return c;
}

/** RLS を通らない管理者接続（テストデータの準備・確認用） */
export async function adminClient(): Promise<pg.Client> {
  return connect();
}

/** ログインユーザーとしての接続（authenticated ロール + JWT の sub） */
export async function userClient(userId: string): Promise<pg.Client> {
  const c = await connect();
  await c.query("select set_config('request.jwt.claims', $1, false)", [
    JSON.stringify({ sub: userId, role: "authenticated" }),
  ]);
  await c.query("set role authenticated");
  return c;
}

/** 未ログインの接続（anon ロール） */
export async function anonClient(): Promise<pg.Client> {
  const c = await connect();
  await c.query("set role anon");
  return c;
}

/** auth.users とプロフィールを作る */
export async function createUser(
  admin: pg.Client,
  opts: { name?: string; level?: string; withProfile?: boolean } = {},
): Promise<string> {
  const id = randomUUID();
  await admin.query("insert into auth.users (id, email) values ($1, $2)", [id, `${id}@example.com`]);
  if (opts.withProfile !== false) {
    await admin.query("insert into public.profiles (id, display_name, level) values ($1, $2, $3)", [
      id,
      opts.name ?? "テストユーザー",
      opts.level ?? "intermediate",
    ]);
  }
  return id;
}

/** Postgres のエラーメッセージを取り出す（成功したら null） */
export async function errorOf(p: Promise<unknown>): Promise<string | null> {
  try {
    await p;
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

type EventOpts = {
  capacity?: number;
  requiresApproval?: boolean;
  startsInHours?: number;
  status?: "open" | "cancelled";
};

/** イベントを作る（既定: 定員2・承認制なし・1日後に開始） */
export async function createEvent(admin: pg.Client, hostId: string, opts: EventOpts = {}) {
  const hours = opts.startsInHours ?? 24;
  const { rows } = await admin.query(
    `insert into public.events
       (host_id, title, starts_at, ends_at, venue, area, capacity, requires_approval, status)
     values ($1, 'テスト練習会', now() + make_interval(hours => $2), now() + make_interval(hours => $2 + 2),
             '船橋市総合体育館', '千葉県船橋市', $3, $4, $5)
     returning id`,
    [hostId, hours, opts.capacity ?? 2, opts.requiresApproval ?? false, opts.status ?? "open"],
  );
  return rows[0].id as string;
}

/** 管理者権限で参加行を直接入れる（テストの前提づくり用） */
export async function insertParticipation(
  admin: pg.Client,
  eventId: string,
  userId: string,
  status: string,
) {
  const { rows } = await admin.query(
    `insert into public.participations (event_id, user_id, status, waitlisted_at)
     values ($1, $2, $3, case when $3 = 'waitlisted' then clock_timestamp() end)
     returning id`,
    [eventId, userId, status],
  );
  return rows[0].id as string;
}
