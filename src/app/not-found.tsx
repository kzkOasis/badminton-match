import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-3 py-10 text-center">
      <h1 className="text-xl font-bold">ページが見つかりません</h1>
      <p className="text-muted-foreground text-sm">
        イベントが削除されたか、見る権限がない可能性があります。
      </p>
      <Link href="/events" className="text-primary text-sm underline">
        イベント一覧へ
      </Link>
    </div>
  );
}
