import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { requireProfile } from "@/lib/auth";
import { formatDateTime, formatDateTimeRange } from "@/lib/datetime";
import { hasStarted, isFull } from "@/lib/event-state";
import { isLevel, LEVEL_LABELS } from "@/lib/levels";
import { getEventSummary } from "@/lib/queries/events";
import { createClient } from "@/lib/supabase/server";
import { DecisionButtons } from "./decision-buttons";

export const metadata: Metadata = { title: "申込管理" };

type Row = {
  id: string;
  status: string;
  message: string | null;
  created_at: string;
  waitlisted_at: string | null;
  user: { display_name: string; level: string; area: string | null; bio: string | null } | null;
};

function Applicant({ row, children }: { row: Row; children?: React.ReactNode }) {
  return (
    <li className="space-y-2 rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{row.user?.display_name ?? "（退会したユーザー）"}</span>
        {row.user && isLevel(row.user.level) && <Badge variant="outline">{LEVEL_LABELS[row.user.level]}</Badge>}
        {row.user?.area && <span className="text-muted-foreground text-xs">{row.user.area}</span>}
        <span className="text-muted-foreground ml-auto text-xs">{formatDateTime(row.created_at)} 申込</span>
      </div>
      {row.message && (
        <p className="bg-muted rounded-md p-2 text-sm whitespace-pre-wrap">{row.message}</p>
      )}
      {row.user?.bio && (
        <details className="text-sm">
          <summary className="text-muted-foreground cursor-pointer text-xs">自己紹介</summary>
          <p className="mt-1 whitespace-pre-wrap">{row.user.bio}</p>
        </details>
      )}
      {children}
    </li>
  );
}

function Section({ title, count, empty, children }: { title: string; count: number; empty: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-semibold">
        {title} <span className="text-muted-foreground text-sm font-normal">{count}人</span>
      </h2>
      {count === 0 ? <p className="text-muted-foreground text-sm">{empty}</p> : <ul className="space-y-3">{children}</ul>}
    </section>
  );
}

export default async function ManagePage(props: PageProps<"/events/[id]/manage">) {
  const { id } = await props.params;
  const profile = await requireProfile(`/events/${id}/manage`);
  const supabase = await createClient();
  const event = await getEventSummary(supabase, id);
  if (!event || event.host_id !== profile.id) notFound();

  const { data, error } = await supabase
    .from("participations")
    .select(
      "id, status, message, created_at, waitlisted_at, user:profiles!participations_user_id_fkey(display_name, level, area, bio)",
    )
    .eq("event_id", id)
    .in("status", ["pending", "approved", "waitlisted"])
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = data as Row[];

  const pending = rows.filter((r) => r.status === "pending");
  const approved = rows.filter((r) => r.status === "approved");
  const waitlisted = rows
    .filter((r) => r.status === "waitlisted")
    .sort((a, b) => (a.waitlisted_at ?? "").localeCompare(b.waitlisted_at ?? ""));

  const full = isFull(event);
  const locked = event.status === "cancelled" || hasStarted(event);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href={`/events/${id}`} className="text-primary text-sm underline">
          ← イベントに戻る
        </Link>
        <h1 className="text-2xl font-bold">申込管理</h1>
        <p className="text-sm">
          {event.title}（{formatDateTimeRange(event.starts_at, event.ends_at)}）
        </p>
        <p className="text-sm">
          参加確定 <span className="font-semibold">{event.approved_count}/{event.capacity}人</span>
          {full && <Badge variant="destructive" className="ml-2">満員</Badge>}
        </p>
        {locked && (
          <p className="text-muted-foreground text-sm">
            {event.status === "cancelled" ? "中止したイベントのため" : "開始時刻を過ぎたため"}、承認・見送りはできません。
          </p>
        )}
      </div>

      {(event.requires_approval || pending.length > 0) && (
        <Section title="承認待ち" count={pending.length} empty="承認待ちの申し込みはありません。">
          {pending.map((r) => (
            <Applicant key={r.id} row={r}>
              {!locked && <DecisionButtons eventId={id} participationId={r.id} status="pending" full={full} />}
            </Applicant>
          ))}
        </Section>
      )}

      <Section title="参加確定" count={approved.length} empty="まだ参加確定の人はいません。">
        {approved.map((r) => (
          <Applicant key={r.id} row={r} />
        ))}
      </Section>

      <Section title="キャンセル待ち" count={waitlisted.length} empty="キャンセル待ちの人はいません。">
        {waitlisted.map((r, i) => (
          <Applicant key={r.id} row={r}>
            <p className="text-muted-foreground text-xs">{i + 1}番目</p>
            {!locked && <DecisionButtons eventId={id} participationId={r.id} status="waitlisted" full={full} />}
          </Applicant>
        ))}
      </Section>
    </div>
  );
}
