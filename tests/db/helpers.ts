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
