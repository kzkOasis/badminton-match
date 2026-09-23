import { redirect } from "next/navigation";
import { cache } from "react";
import type { Tables } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

/** 現在のユーザーID（未ログインなら null）。1リクエスト内ではキャッシュする */
export const getUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
});

export const getMyProfile = cache(async (): Promise<Tables<"profiles"> | null> => {
  const userId = await getUserId();
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return data;
});

export async function requireUser(next: string): Promise<string> {
  const userId = await getUserId();
  if (!userId) redirect(`/login?next=${encodeURIComponent(next)}`);
  return userId;
}

/** ログイン済みかつプロフィール登録済みであることを求める。未登録ならプロフィール編集へ */
export async function requireProfile(next: string): Promise<Tables<"profiles">> {
  await requireUser(next);
  const profile = await getMyProfile();
  if (!profile) redirect(`/me/profile?next=${encodeURIComponent(next)}`);
  return profile;
}
