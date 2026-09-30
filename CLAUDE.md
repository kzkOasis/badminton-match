@AGENTS.md

# プロジェクトメモ

- 設計書: `docs/design.md`（仕様の正はこれ）
- 参加状態の変更（申込・承認・キャンセル・繰り上げ）は必ず Postgres 関数（`supabase.rpc`）経由。クライアントから `participations` を直接書かない
- マイグレーションを変えたら `src/lib/database.types.ts` も合わせる
- 各タスクの完了時に `npm run lint` / `npm run typecheck` / `npm test` を通す
- DB テストは `TEST_DATABASE_URL`（既定: `supabase start` の `127.0.0.1:54322`）に使い捨ての DB を作って、`tests/db/supabase-stub.sql` とマイグレーションを流して実行する

## 本番環境

- 本番は Vercel プロジェクト **`badminton-match-qvcs`**（https://vercel.com/kzkoasis-projects/badminton-match-qvcs）
  - URL: https://badminton-match-qvcs.vercel.app （独自ドメインを付けたらここを更新）
  - main にマージすると本番へ自動デプロイされる
- Vercel プロジェクト `badminton-match`（qvcs なし）は同じリポジトリをデプロイしている重複で、本番ではない。設定の変更・確認はしない
- 2つのプロジェクトはどちらもこのリポジトリの同じコードをビルドするので、アプリのコードに違いはない。違うのは Vercel 側の設定だけ
  - 環境変数（`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_CONTACT_*`）は qvcs 側に設定する
- Supabase: プロジェクト `badminton-matching`（ref `gapvjlyiiqfaisovtkbx`）
  - Authentication > URL Configuration の Site URL と Redirect URLs（`/auth/callback`）は qvcs のドメインに合わせる
- 修正の流れ: ブランチで変更 → PR → CI（lint・型チェック・テスト・ビルド）が通ったら main にマージ → qvcs に自動デプロイ
