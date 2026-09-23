import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeRange } from "@/lib/datetime";
import { feeLabel, isFull } from "@/lib/event-state";
import { levelRangeLabel } from "@/lib/levels";
import type { EventSummary } from "@/lib/queries/events";

export function EventCard({ event }: { event: EventSummary }) {
  const full = isFull(event);
  return (
    <Link
      href={`/events/${event.id}`}
      className="bg-card hover:bg-accent/50 block rounded-xl border p-4 shadow-sm transition-colors"
    >
      <div className="text-primary text-sm font-semibold">
        {formatDateTimeRange(event.starts_at, event.ends_at)}
      </div>
      <div className="mt-1 font-bold">{event.title}</div>
      <div className="text-muted-foreground mt-1 text-sm">
        {event.venue}（{event.area}）
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline">{levelRangeLabel(event.level_min, event.level_max)}</Badge>
        <Badge variant="outline">{feeLabel(event.fee)}</Badge>
        {event.requires_approval && <Badge variant="secondary">承認制</Badge>}
        {event.status === "cancelled" ? (
          <Badge variant="destructive">中止</Badge>
        ) : full ? (
          <Badge variant="destructive">満員{event.waitlist_count > 0 && `・待ち${event.waitlist_count}人`}</Badge>
        ) : null}
        <span className="text-muted-foreground ml-auto text-sm">
          参加 {event.approved_count}/{event.capacity}人
        </span>
      </div>
    </Link>
  );
}
