import Link from "next/link";
import { EventCard } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import { listUpcomingEvents } from "@/lib/queries/events";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const events = await listUpcomingEvents(supabase, {}, 5);

  return (
    <div className="space-y-10">
      <section className="space-y-4 py-6 text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">一緒に打つ仲間を、すぐに見つける。</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          体育館の個人開放やサークルの空き枠で、バドミントンの練習会・ゲーム会を開いて参加者を募集できます。
        </p>
        <div className="flex justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/events">イベントをさがす</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/events/new">募集する</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-3 text-sm sm:grid-cols-3">
        {[
          ["1. さがす", "地域・日付・レベルで、参加できる練習会を見つけます。"],
          ["2. 申し込む", "満員でもキャンセル待ちに並べます。空きが出たら順番に繰り上がります。"],
          ["3. チャットで連絡", "参加が決まったら、主催者・参加者とイベントのチャットで連絡を取れます。"],
        ].map(([title, body]) => (
          <div key={title} className="rounded-xl border p-4">
            <div className="font-semibold">{title}</div>
            <p className="text-muted-foreground mt-1">{body}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">直近のイベント</h2>
          <Link href="/events" className="text-primary text-sm underline">
            すべて見る
          </Link>
        </div>
        {events.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
            いま募集中のイベントはありません。
          </p>
        ) : (
          <ul className="space-y-3">
            {events.map((e) => (
              <li key={e.id}>
                <EventCard event={e} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
