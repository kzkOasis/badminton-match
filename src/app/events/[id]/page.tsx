import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getUserId } from "@/lib/auth";
import { formatDateTimeRange } from "@/lib/datetime";
import { feeLabel, hasStarted, isFull } from "@/lib/event-state";
import { levelRangeLabel } from "@/lib/levels";
import { getEventSummary } from "@/lib/queries/events";
import { createClient } from "@/lib/supabase/server";
import { ParticipationPanel } from "./participation-panel";

export async function generateMetadata(props: PageProps<"/events/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const supabase = await createClient();
  const event = await getEventSummary(supabase, id);
  return { title: event?.title ?? "イベント" };
}

export default async function EventDetailPage(props: PageProps<"/events/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const event = await getEventSummary(supabase, id);
  if (!event) notFound();

  const userId = await getUserId();
  const isHost = userId === event.host_id;
  const { data: host } = userId
    ? await supabase.from("profiles").select("display_name, level").eq("id", event.host_id).maybeSingle()
    : { data: null };

  const { data: mine } =
    userId && !isHost
      ? await supabase
          .from("participations")
          .select("status")
          .eq("event_id", event.id)
          .eq("user_id", userId)
          .maybeSingle()
      : { data: null };
  const { data: waitlistPosition } =
    mine?.status === "waitlisted"
      ? await supabase.rpc("my_waitlist_position", { p_event_id: event.id })
      : { data: null };

  const cancelled = event.status === "cancelled";
  const started = hasStarted(event);
  const full = isFull(event);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {cancelled && <Badge variant="destructive">中止</Badge>}
          {!cancelled && started && <Badge variant="secondary">開催済み・開催中</Badge>}
          {!cancelled && !started && full && <Badge variant="destructive">満員</Badge>}
          {event.requires_approval && <Badge variant="secondary">承認制</Badge>}
        </div>
        <h1 className="text-2xl font-bold">{event.title}</h1>
      </div>

      <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-2 text-sm">
        <dt className="text-muted-foreground">日時</dt>
        <dd className="font-medium">{formatDateTimeRange(event.starts_at, event.ends_at)}</dd>
        <dt className="text-muted-foreground">会場</dt>
        <dd>
          {event.venue}
          <span className="text-muted-foreground">（{event.area}）</span>
        </dd>
        <dt className="text-muted-foreground">レベル</dt>
        <dd>{levelRangeLabel(event.level_min, event.level_max)}</dd>
        <dt className="text-muted-foreground">参加費</dt>
        <dd>{feeLabel(event.fee)}</dd>
        <dt className="text-muted-foreground">参加者</dt>
        <dd>
          <span className="font-medium">
            {event.approved_count}/{event.capacity}人
          </span>
          {event.waitlist_count > 0 && (
            <span className="text-muted-foreground">（キャンセル待ち {event.waitlist_count}人）</span>
          )}
        </dd>
        <dt className="text-muted-foreground">主催者</dt>
        <dd>
          {host ? (
            host.display_name
          ) : (
            <span className="text-muted-foreground">ログインすると表示されます</span>
          )}
        </dd>
      </dl>

      {event.description && (
        <section className="space-y-2">
          <h2 className="font-semibold">説明</h2>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{event.description}</p>
        </section>
      )}

      {!isHost && (
        <section className="rounded-xl border p-4">
          {cancelled ? (
            <p className="text-sm">このイベントは中止になりました。</p>
          ) : !userId ? (
            <div className="space-y-2">
              <Button asChild size="lg" className="w-full">
                <Link href={`/login?next=${encodeURIComponent(`/events/${event.id}`)}`}>
                  ログインして申し込む
                </Link>
              </Button>
            </div>
          ) : started ? (
            <p className="text-sm">
              {mine?.status === "approved" ? (
                <>
                  参加確定済みです。{" "}
                  <Link href={`/events/${event.id}/chat`} className="text-primary underline">
                    チャットを開く
                  </Link>
                </>
              ) : (
                "開始時刻を過ぎたため、申し込みは締め切られました。"
              )}
            </p>
          ) : (
            <ParticipationPanel
              eventId={event.id}
              status={mine?.status ?? null}
              waitlistPosition={waitlistPosition ?? null}
              full={full}
              hasWaitlist={event.waitlist_count > 0}
              requiresApproval={event.requires_approval}
            />
          )}
        </section>
      )}

      {isHost && (
        <section className="space-y-2 rounded-xl border p-4">
          <h2 className="font-semibold">主催者メニュー</h2>
          <div className="flex flex-wrap gap-2">
            {!cancelled && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/events/${event.id}/edit`}>編集・中止</Link>
              </Button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
