# バドミントン募集アプリ

バドミントンの練習会・ゲーム会を作って参加者を募るWebアプリ。設計は [`docs/design.md`](docs/design.md)。

- Next.js 16（App Router）/ React 19 / TypeScript / Tailwind CSS / shadcn/ui
- Supabase（Google ログイン / Postgres / RLS / Realtime）

## 構成

| 場所 | 内容 |
|---|---|
| `supabase/migrations/` | テーブル・RLS・参加状態を変える Postgres 関数 |
| `src/app/` | 画面（`/events`, `/events/[id]`, `/events/[id]/manage`, `/events/[id]/chat`, `/me` など） |
| `src/lib/` | 入力チェック・日時（日本時間）・DB の型・Supabase クライアント |
| `tests/db/` | DB 関数と RLS のテスト |

参加状態（申込・承認・キャンセル・繰り上げ）は、クライアントから `participations` を直接書き換えず、
Postgres 関数（`apply_to_event` / `cancel_participation` / `decide_participation`）で変える。
関数はイベント行を `select ... for update` でロックしてから件数を数えるので、同時申込でも定員を超えない。

## 開発

```bash
npm install
cp .env.example .env.local   # Supabase の URL とキーを入れる
npm run dev
```

### Supabase の準備

1. Supabase でプロジェクトを作る
2. マイグレーションを適用する: `npx supabase link --project-ref <ref>` → `npx supabase db push`
3. Authentication > Sign In / Providers で Google を有効にし、Google Cloud Console で作った OAuth クライアントの ID とシークレットを入れる
   （Google 側の「承認済みのリダイレクト URI」には Supabase が表示するコールバック URL を登録する）
4. Authentication > URL Configuration
   - Site URL: 本番の URL（例: `https://<ドメイン>`）
   - Redirect URLs: `http://localhost:3000/auth/callback` と `https://<ドメイン>/auth/callback`
5. Settings > API Keys の Project URL と Publishable key を `.env.local` に入れる

ローカルで Supabase 一式を動かす場合は `npx supabase start`（Docker が必要）。
Google ログインをローカルで試すには `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` を設定する。

無料プランの制限（一定期間使われないプロジェクトの一時停止など）は変わることがあるので、
Supabase の最新の料金・制限のドキュメントで確認すること。

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

## Vercel への公開

1. Vercel でこのリポジトリをインポートする（Framework Preset: Next.js。設定は既定のままでよい）
2. Environment Variables に次を設定する
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_CONTACT_EMAIL` または `NEXT_PUBLIC_CONTACT_URL`（`/contact` に表示する問い合わせ先）
3. デプロイ後、本番のドメインを Supabase の Site URL と Redirect URLs（`https://<ドメイン>/auth/callback`）に加える
4. 公開前に `/terms` と `/privacy` の文面（運営者の表記、制定日など）を見直す

サービスロールキーは使っていない。Vercel にも設定しないこと。
