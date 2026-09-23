# バドミントン募集アプリ

バドミントンの練習会・ゲーム会を作って参加者を募るWebアプリ。設計は [`docs/design.md`](docs/design.md)。

- Next.js 16（App Router）/ React 19 / TypeScript / Tailwind CSS / shadcn/ui
- Supabase（Google ログイン / Postgres / RLS / Realtime）

## 開発

```bash
npm install
cp .env.example .env.local   # Supabase の URL とキーを入れる
npm run dev
```

### Supabase の準備

1. Supabase でプロジェクトを作る
2. `supabase/migrations/` を適用する（`npx supabase link` → `npx supabase db push`）
3. Authentication > Providers で Google を有効にし、Google Cloud の OAuth クライアントを設定する
4. Authentication > URL Configuration の Redirect URLs に `http://localhost:3000/auth/callback` と本番の `https://<ドメイン>/auth/callback` を加える

## チェック

```bash
npm run lint
npm run typecheck
npm test
```

`npm test` の DB テストは Postgres を使う。`npx supabase start` で立ち上げたローカル環境
（`127.0.0.1:54322`）か、`TEST_DATABASE_URL` で指定した Postgres に使い捨ての DB を作り、
`tests/db/supabase-stub.sql`（auth スキーマ・ロールの最小互換）とマイグレーションを流してから実行する。
接続できないときは DB テストだけスキップする（CI では失敗にする）。
