import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/lib/database.types";
import { requireProfile } from "@/lib/auth";
import { formatDateTime, formatDateTimeRange } from "@/lib/datetime";
import { isLevel, LEVEL_LABELS } from "@/lib/levels";
import { type ParticipationStatus, STATUS_LABELS } from "@/lib/participation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "マイページ" };

type EventRow = Tables<"events">;
type Item = {
  event: EventRow;
  status?: ParticipationStatus;
  hasUpdate?: boolean;
  pendingCount?: number;
  lastMessageAt?: string;
  waitlistPosition?: number | null;
};

const UPDATE_TEXT: Partial<Record<ParticipationStatus, string>> = {
  approved: "参加が確定しました",
  pending: "キャンセル待ちから繰り上がりました（主催者の承認待ち）",
  waitlisted: "キャンセル待ちに回りました",
  rejected: "今回は見送りになりました",
};

function EventItem({ item, showChat }: { item: Item; showChat: boolean }) {
  const { event } = item;
  return (
    <li
      className={
        item.hasUpdate
          ? "border-primary bg-primary/5 space-y-1 rounded-xl border-2 p-3"
          : "space-y-1 rounded-xl border p-3"
      }
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-primary text-sm font-semibold">
          {formatDateTimeRange(event.starts_at, event.ends_at)}
        </span>
        {event.status === "cancelled" && <Badge variant="destructive">中止</Badge>}
        {!!item.pendingCount && <Badge variant="destructive">承認待ち {item.pendingCount}</Badge>}
        {item.status && item.status !== "approved" && (
          <Badge variant="secondary">
            {STATUS_LABELS[item.status]}
            {item.waitlistPosition ? `（${item.waitlistPosition}番目）` : ""}
          </Badge>
        )}
      </div>
      <Link href={`/events/${event.id}`} className="block font-semibold hover:underline">
        {event.title}
      </Link>
      <div className="text-muted-foreground text-xs">{event.venue}</div>
      {item.hasUpdate && item.status && UPDATE_TEXT[item.status] && (
        <p className="text-primary text-sm font-medium">{UPDATE_TEXT[item.status]}</p>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {item.pendingCount !== undefined && (
          <Button asChild size="sm" variant={item.pendingCount ? "default" : "outline"}>
            <Link href={`/events/${event.id}/manage`}>申込管理</Link>
          </Button>
        )}
        {showChat && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/events/${event.id}/chat`}>チャット</Link>
          </Button>
        )}
        {showChat && (
          <span className="text-muted-foreground text-xs">
            {item.lastMessageAt ? `最新メッセージ ${formatDateTime(item.lastMessageAt)}` : "メッセージなし"}
          </span>
        )}
      </div>
    </li>
  );
}

function Section({ title, items, empty, chat }: { title: string; items: Item[]; empty?: string; chat: (i: Item) => boolean }) {
  if (items.length === 0 && !empty) return null;
  return (
    <section className="space-y-2">
      <h2 className="font-bold">
        {title} <span className="text-muted-foreground text-sm font-normal">{items.length}</span>
      </h2>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <EventItem key={i.event.id} item={i} showChat={chat(i)} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function MyPage() {
  const profile = await requireProfile("/me");
  const supabase = await createClient();
  const now = new Date();

  const [{ data: hosted, error: e1 }, { data: mine, error: e2 }] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .eq("host_id", profile.id)
      .gte("ends_at", new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString())
      .order("starts_at"),
    supabase
      .from("participations")
      .select("status, has_update, event:events!participations_event_id_fkey(*)")
      .eq("user_id", profile.id)
      .order("updated_at", { ascending: false }),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const hostedIds = hosted.map((e) => e.id);
  const approvedIds = mine.filter((p) => p.status === "approved" && p.event).map((p) => p.event!.id);
  const waitlistedIds = mine.filter((p) => p.status === "waitlisted" && p.event).map((p) => p.event!.id);

  const [{ data: pendings }, { data: lastTimes }, positions] = await Promise.all([
    hostedIds.length
      ? supabase.from("participations").select("event_id").eq("status", "pending").in("event_id", hostedIds)
      : Promise.resolve({ data: [] as { event_id: string }[] }),
    supabase.rpc("latest_message_times", { p_event_ids: [...hostedIds, ...approvedIds] }),
    Promise.all(
      waitlistedIds.map(async (id) => {
        const { data } = await supabase.rpc("my_waitlist_position", { p_event_id: id });
        return [id, data] as const;
      }),
    ),
  ]);

  const pendingCount = new Map<string, number>();
  for (const p of pendings ?? []) pendingCount.set(p.event_id, (pendingCount.get(p.event_id) ?? 0) + 1);
  const lastAt = new Map((lastTimes ?? []).map((t) => [t.event_id, t.last_message_at]));
  const position = new Map(positions);

  const isUpcoming = (e: EventRow) => new Date(e.ends_at) >= now;

  const hostedUpcoming: Item[] = hosted.filter(isUpcoming).map((event) => ({
    event,
    pendingCount: pendingCount.get(event.id) ?? 0,
    lastMessageAt: lastAt.get(event.id),
  }));

  const participations: Item[] = mine
    .filter((p) => p.event)
    .map((p) => ({
      event: p.event!,
      status: p.status as ParticipationStatus,
      hasUpdate: p.has_update,
      lastMessageAt: lastAt.get(p.event!.id),
      waitlistPosition: position.get(p.event!.id) ?? null,
    }));

  const updates = participations.filter((i) => i.hasUpdate);
  const byStatus = (s: ParticipationStatus) =>
    participations
      .filter((i) => i.status === s && isUpcoming(i.event))
      .sort((a, b) => a.event.starts_at.localeCompare(b.event.starts_at));
  const past = [
    ...hosted.filter((e) => !isUpcoming(e)).map((event) => ({ event, lastMessageAt: lastAt.get(event.id) })),
    ...participations.filter((i) => i.status === "approved" && !isUpcoming(i.event)),
  ].sort((a, b) => b.event.starts_at.localeCompare(a.event.starts_at));

  const totalPending = hostedUpcoming.reduce((n, i) => n + (i.pendingCount ?? 0), 0);

  // ここで表示したので「変更あり」の印を消す（この画面では強調表示したまま）
  if (updates.length) await supabase.rpc("mark_participation_updates_seen");

  return (
    <div className="space-y-8">
      <section className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{profile.display_name}</h1>
          <p className="text-muted-foreground text-sm">
            {isLevel(profile.level) && LEVEL_LABELS[profile.level]}
            {profile.area && `・${profile.area}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/me/profile">プロフィール編集</Link>
          </Button>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="ghost" size="sm">
              ログアウト
            </Button>
          </form>
        </div>
      </section>

      {(totalPending > 0 || updates.length > 0) && (
        <section className="border-primary space-y-1 rounded-xl border-2 p-4">
          <h2 className="font-bold">要対応</h2>
          <ul className="list-inside list-disc text-sm">
            {totalPending > 0 && <li>承認待ちの申し込みが {totalPending}件 あります</li>}
            {updates.length > 0 && <li>申し込みの状態が変わったイベントが {updates.length}件 あります</li>}
          </ul>
        </section>
      )}

      {updates.length > 0 && (
        <Section title="状態が変わった申し込み" items={updates} chat={(i) => i.status === "approved"} />
      )}

      <Section
        title="主催するイベント"
        items={hostedUpcoming}
        empty="主催予定のイベントはありません。"
        chat={() => true}
      />
      <Section
        title="参加予定"
        items={byStatus("approved")}
        empty="参加予定のイベントはありません。"
        chat={() => true}
      />
      <Section title="申請中" items={byStatus("pending")} chat={() => false} />
      <Section title="キャンセル待ち" items={byStatus("waitlisted")} chat={() => false} />

      {past.length > 0 && (
        <details className="space-y-2">
          <summary className="cursor-pointer font-bold">終了したイベント（{past.length}）</summary>
          <ul className="mt-2 space-y-2">
            {past.slice(0, 20).map((i) => (
              <EventItem key={i.event.id} item={i} showChat />
            ))}
          </ul>
        </details>
      )}

      <div className="text-center">
        <Button asChild>
          <Link href="/events">イベントをさがす</Link>
        </Button>
      </div>
    </div>
  );
}
