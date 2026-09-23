import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="space-y-4 py-6 text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">一緒に打つ仲間を、すぐに見つける。</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          体育館の個人開放やサークルの空き枠で、バドミントンの練習会・ゲーム会を開いて参加者を募集できます。
        </p>
        <div className="flex justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/events">イベントをさがす</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/events/new">募集する</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
