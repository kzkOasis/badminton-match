import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventForm } from "@/components/event-form";
import { requireProfile } from "@/lib/auth";
import { getEventSummary } from "@/lib/queries/events";
import { createClient } from "@/lib/supabase/server";
import { updateEvent } from "../../actions";
import { CancelEventButton } from "./cancel-event-button";

export const metadata: Metadata = { title: "イベントの編集" };

export default async function EditEventPage(props: PageProps<"/events/[id]/edit">) {
  const { id } = await props.params;
  const profile = await requireProfile(`/events/${id}/edit`);
  const supabase = await createClient();
  const event = await getEventSummary(supabase, id);
  if (!event || event.host_id !== profile.id) notFound();

  if (event.status === "cancelled") {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-2xl font-bold">イベントの編集</h1>
        <p className="text-sm">このイベントは中止されているため、編集できません。</p>
        <Link href={`/events/${id}`} className="text-primary text-sm underline">
          イベントに戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">イベントの編集</h1>
        <EventForm
          action={updateEvent.bind(null, id)}
          event={event}
          submitLabel="保存する"
          minCapacity={Math.max(1, event.approved_count)}
        />
      </div>
      <section className="border-destructive/40 space-y-3 rounded-xl border p-4">
        <h2 className="font-semibold">イベントの中止</h2>
        <p className="text-muted-foreground text-sm">
          中止すると、新しい申し込みとチャットへの投稿ができなくなります。参加者への連絡は中止の前にチャットで行ってください。
        </p>
        <CancelEventButton eventId={id} />
      </section>
    </div>
  );
}
