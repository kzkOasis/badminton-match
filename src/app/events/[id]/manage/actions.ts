"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

export type Decision = "approve" | "reject" | "waitlist";

export async function decideParticipation(
  eventId: string,
  participationId: string,
  decision: Decision,
): Promise<{ message?: string }> {
  if (!(await getUserId())) redirect(`/login?next=/events/${eventId}/manage`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_participation", {
    p_participation_id: participationId,
    p_decision: decision,
  });

  revalidatePath(`/events/${eventId}/manage`);
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/me", "layout");
  if (error) return { message: errorMessage(error) };
  return {};
}
