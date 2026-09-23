import type { Metadata } from "next";
import Link from "next/link";
import { EventCard } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { todayJst } from "@/lib/datetime";
import { parseEventFilters } from "@/lib/event-filters";
import { LEVEL_LABELS, LEVELS } from "@/lib/levels";
import { PREFECTURES } from "@/lib/prefectures";
import { listUpcomingEvents } from "@/lib/queries/events";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "イベントをさがす" };

export default async function EventsPage(props: PageProps<"/events">) {
  const filters = parseEventFilters(await props.searchParams);
  const supabase = await createClient();
  const events = await listUpcomingEvents(supabase, filters);
  const filtered = Boolean(filters.prefecture || filters.date || filters.level);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">イベントをさがす</h1>
        <Button asChild size="sm">
          <Link href="/events/new">募集する</Link>
        </Button>
      </div>

      <form className="bg-muted/40 grid grid-cols-2 gap-2 rounded-xl border p-3 sm:grid-cols-4" role="search">
        <NativeSelect name="prefecture" defaultValue={filters.prefecture} aria-label="地域">
          <option value="">すべての地域</option>
          {PREFECTURES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="level" defaultValue={filters.level} aria-label="レベル">
          <option value="">すべてのレベル</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {LEVEL_LABELS[l]}が参加できる
            </option>
          ))}
        </NativeSelect>
        <Input
          type="date"
          name="date"
          min={todayJst()}
          defaultValue={filters.date}
          aria-label="開催日"
          className="col-span-2 sm:col-span-1"
        />
        <div className="col-span-2 flex gap-2 sm:col-span-1">
          <Button type="submit" className="flex-1">
            絞り込む
          </Button>
          {filtered && (
            <Button asChild variant="ghost">
              <Link href="/events">解除</Link>
            </Button>
          )}
        </div>
      </form>

      {events.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
          {filtered ? "条件に合うイベントはありません。" : "いま募集中のイベントはありません。"}
          <div className="mt-3">
            <Link href="/events/new" className="text-primary underline">
              イベントを作って募集する
            </Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => (
            <li key={e.id}>
              <EventCard event={e} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
