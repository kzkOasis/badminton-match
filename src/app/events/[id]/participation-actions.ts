"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMyProfile, getUserId } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { APPLY_RESULT_MESSAGES } from "@/lib/participation";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok?: boolean; message?: string };

function revalidateEvent(eventId: string) {
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/me");
}

export async function applyToEvent(
  eventId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const next = `/events/${eventId}`;
  if (!(await getUserId())) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!(await getMyProfile())) redirect(`/me/profile?next=${encodeURIComponent(next)}`);

  const message = formData.get("message");
  const text = typeof message === "string" ? message.trim().slice(0, 500) : "";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("apply_to_event", {
    p_event_id: eventId,
    p_message: text || null,
  });
  if (error) return { message: errorMessage(error) };

  revalidateEvent(eventId);
  return { ok: true, message: APPLY_RESULT_MESSAGES[data] };
}

export async function cancelParticipation(eventId: string): Promise<ActionResult> {
  if (!(await getUserId())) redirect(`/login?next=/events/${eventId}`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_participation", { p_event_id: eventId });
  if (error) return { message: errorMessage(error) };

  revalidateEvent(eventId);
  return { ok: true, message: "キャンセルしました。" };
}
