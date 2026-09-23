import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    dbUrl: string | null;
  }
}

// supabase start の既定の接続先。素の Postgres でもよい
const ADMIN_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:54322/postgres";

const root = path.resolve(import.meta.dirname, "../..");

export default async function setup(project: TestProject) {
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  try {
    await admin.connect();
  } catch {
    if (process.env.CI) throw new Error(`テスト用 DB に接続できません: ${ADMIN_URL}`);
    console.warn(
      `\n[db] ${ADMIN_URL} に接続できないため DB テストをスキップします。` +
        "\n     supabase start するか、TEST_DATABASE_URL を設定してください。\n",
    );
    project.provide("dbUrl", null);
    return;
  }

  const dbName = `bm_test_${Date.now()}_${process.pid}`;
  await admin.query(`create database ${dbName}`);
  const url = new URL(ADMIN_URL);
  url.pathname = `/${dbName}`;
  const dbUrl = url.toString();

  const db = new pg.Client({ connectionString: dbUrl });
  await db.connect();
  try {
    await db.query(readFileSync(path.join(root, "tests/db/supabase-stub.sql"), "utf8"));
    const dir = path.join(root, "supabase/migrations");
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      try {
        await db.query(readFileSync(path.join(dir, file), "utf8"));
      } catch (e) {
        throw new Error(`マイグレーション ${file} の適用に失敗: ${(e as Error).message}`);
      }
    }
  } finally {
    await db.end();
  }

  project.provide("dbUrl", dbUrl);

  return async () => {
    await admin.query(`drop database if exists ${dbName} with (force)`);
    await admin.end();
  };
}
