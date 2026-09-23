"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { type FormState, formValues } from "@/lib/form";
import { parseProfileForm } from "@/lib/profile";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await getUserId();
  if (!userId) redirect("/login?next=/me/profile");

  const parsed = parseProfileForm(formData);
  if (!parsed.ok) return { errors: parsed.errors, values: formValues(formData) };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").upsert({ id: userId, ...parsed.value });
  if (error) {
    return { message: "保存できませんでした。時間をおいてもう一度お試しください。", values: formValues(formData) };
  }

  revalidatePath("/", "layout");
  const next = formData.get("next");
  redirect(safeNext(typeof next === "string" ? next : null, "/me"));
}
