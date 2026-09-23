import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserId } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { LoginButton } from "./login-button";

export const metadata: Metadata = { title: "ログイン" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { next, error } = await props.searchParams;
  const nextPath = safeNext(typeof next === "string" ? next : null);
  if (await getUserId()) redirect(nextPath);

  return (
    <div className="mx-auto max-w-sm py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">ログイン</CardTitle>
          <CardDescription>
            イベントの作成・申込には Google アカウントでのログインが必要です。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-destructive text-sm">
              ログインに失敗しました。もう一度お試しください。
            </p>
          )}
          <LoginButton next={nextPath} />
          <p className="text-muted-foreground text-xs">
            ログインすると、<Link href="/terms" className="underline">利用規約</Link>と
            <Link href="/privacy" className="underline">プライバシーポリシー</Link>
            に同意したものとみなします。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
