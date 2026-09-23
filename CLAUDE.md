@AGENTS.md

# プロジェクトメモ

- 設計書: `docs/design.md`（仕様の正はこれ）
- 参加状態の変更（申込・承認・キャンセル・繰り上げ）は必ず Postgres 関数（`supabase.rpc`）経由。クライアントから `participations` を直接書かない
- マイグレーションを変えたら `src/lib/database.types.ts` も合わせる
- 各タスクの完了時に `npm run lint` / `npm run typecheck` / `npm test` を通す
- DB テストは `TEST_DATABASE_URL`（既定: `supabase start` の `127.0.0.1:54322`）に使い捨ての DB を作って、`tests/db/supabase-stub.sql` とマイグレーションを流して実行する
