import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { PAGE_SIZE } from "@/lib/chat";
import { formatDateTimeRange } from "@/lib/datetime";
import { getEventSummary } from "@/lib/queries/events";
import { createClient } from "@/lib/supabase/server";
import { ChatRoom } from "./chat-room";

export const metadata: Metadata = { title: "チャット" };

export default async function ChatPage(props: PageProps<"/events/[id]/chat">) {
  const { id } = await props.params;
  const profile = await requireProfile(`/events/${id}/chat`);
  const supabase = await createClient();
  const event = await getEventSummary(supabase, id);
  if (!event) notFound();

  const { data: isMember } = await supabase.rpc("is_event_member", { p_event_id: id });
  if (!isMember) {
    return (
      <div className="mx-auto max-w-lg space-y-3 py-6 text-center">
        <h1 className="text-xl font-bold">チャットに参加できません</h1>
        <p className="text-muted-foreground text-sm">
          チャットは主催者と参加確定した人だけが使えます。
        </p>
        <Link href={`/events/${id}`} className="text-primary text-sm underline">
          イベントに戻る
        </Link>
      </div>
    );
  }

  const [{ data: latest, error }, { data: members }] = await Promise.all([
    supabase
      .from("messages")
      .select("id, event_id, user_id, body, created_at")
      .eq("event_id", id)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE),
    supabase.rpc("event_members", { p_event_id: id }),
  ]);
  if (error) throw error;

  const names: Record<string, string> = {};
  for (const m of members ?? []) names[m.user_id] = m.is_host ? `${m.display_name}（主催）` : m.display_name;

  // メンバーでなくなった人の名前も出す（プロフィールはログインユーザーなら読める）
  const unknown = [...new Set(latest.map((m) => m.user_id))].filter((uid) => !names[uid]);
  if (unknown.length) {
    const { data: others } = await supabase.from("profiles").select("id, display_name").in("id", unknown);
    for (const p of others ?? []) names[p.id] = p.display_name;
  }

  const cancelled = event.status === "cancelled";

  return (
    <div className="space-y-3">
      <div>
        <Link href={`/events/${id}`} className="text-primary text-sm underline">
          ← イベントに戻る
        </Link>
        <h1 className="mt-1 text-lg font-bold">{event.title}</h1>
        <p className="text-muted-foreground text-xs">
          {formatDateTimeRange(event.starts_at, event.ends_at)}・{event.venue}・メンバー
          {(members ?? []).length}人
        </p>
      </div>
      <ChatRoom
        eventId={id}
        meId={profile.id}
        initialMessages={[...latest].reverse()}
        initialHasMore={latest.length === PAGE_SIZE}
        names={names}
        canPost={!cancelled}
        closedReason={cancelled ? "このイベントは中止されたため、投稿できません。" : undefined}
      />
    </div>
  );
}
