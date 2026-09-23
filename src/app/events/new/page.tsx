import type { Metadata } from "next";
import { EventForm } from "@/components/event-form";
import { requireProfile } from "@/lib/auth";
import { splitArea } from "@/lib/prefectures";
import { createEvent } from "../actions";

export const metadata: Metadata = { title: "イベントを作る" };

export default async function NewEventPage() {
  const profile = await requireProfile("/events/new");
  const { prefecture } = splitArea(profile.area ?? "");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">イベントを作る</h1>
      <EventForm action={createEvent} defaultPrefecture={prefecture} submitLabel="募集を開始する" />
    </div>
  );
}
