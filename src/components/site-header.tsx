import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getMyProfile, getUserId } from "@/lib/auth";

export async function SiteHeader() {
  const userId = await getUserId();
  const profile = userId ? await getMyProfile() : null;

  return (
    <header className="bg-background/95 sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
        <Link href="/" className="mr-auto font-bold">
          🏸 バドミントン募集
        </Link>
        <Button asChild variant="ghost" size="sm">
          <Link href="/events">さがす</Link>
        </Button>
        {userId ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={profile ? "/me" : "/me/profile"}>マイページ</Link>
          </Button>
        ) : (
          <Button asChild size="sm">
            <Link href="/login">ログイン</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
