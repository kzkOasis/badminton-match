"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMyProfile, getUserId } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { parseEventForm } from "@/lib/event-form";
import { type FormState, formValues } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";

export async function createEvent(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  if (!userId) redirect("/login?next=/events/new");
  if (!(await getMyProfile())) redirect("/me/profile?next=/events/new");

  const parsed = parseEventForm(formData);
  if (!parsed.ok) return { errors: parsed.errors, values: formValues(formData) };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({ ...parsed.value, host_id: userId })
    .select("id")
    .single();
  if (error) return { message: errorMessage(error), values: formValues(formData) };

  revalidatePath("/events");
  redirect(`/events/${data.id}`);
}

export async function updateEvent(
  eventId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await getUserId();
  if (!userId) redirect(`/login?next=/events/${eventId}/edit`);

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("events")
    .select("host_id, starts_at")
    .eq("id", eventId)
    .maybeSingle();
  if (!current || current.host_id !== userId) return { message: "主催者だけが編集できます。" };

  // 開始済みのイベントは日時を過去のまま保存できるようにする
  const started = new Date(current.starts_at) <= new Date();
  const parsed = parseEventForm(formData, { requireFuture: !started });
  if (!parsed.ok) return { errors: parsed.errors, values: formValues(formData) };

  const { data, error } = await supabase
    .from("events")
    .update(parsed.value)
    .eq("id", eventId)
    .select("id");
  if (error) return { message: errorMessage(error), values: formValues(formData) };
  if (!data.length) return { message: "主催者だけが編集できます。" };

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  redirect(`/events/${eventId}`);
}

export async function cancelEvent(eventId: string): Promise<{ message?: string }> {
  const userId = await getUserId();
  if (!userId) redirect(`/login?next=/events/${eventId}/edit`);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .update({ status: "cancelled" })
    .eq("id", eventId)
    .eq("host_id", userId)
    .select("id");
  if (error) return { message: errorMessage(error) };
  if (!data.length) return { message: "主催者だけが中止できます。" };

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  redirect(`/events/${eventId}`);
}
