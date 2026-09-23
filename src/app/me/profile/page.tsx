import type { Metadata } from "next";
import { getMyProfile, requireUser } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "プロフィール" };

export default async function ProfilePage(props: PageProps<"/me/profile">) {
  await requireUser("/me/profile");
  const { next } = await props.searchParams;
  const profile = await getMyProfile();

  let defaultName = "";
  if (!profile) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const meta = data.user?.user_metadata ?? {};
    defaultName = String(meta.full_name ?? meta.name ?? "").slice(0, 30);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{profile ? "プロフィール編集" : "プロフィール登録"}</h1>
        {!profile && (
          <p className="text-muted-foreground text-sm">
            はじめに、ほかの参加者に表示されるプロフィールを登録してください。
          </p>
        )}
      </div>
      <ProfileForm
        profile={profile}
        defaultName={defaultName}
        next={safeNext(typeof next === "string" ? next : null, "/me")}
      />
    </div>
  );
}
