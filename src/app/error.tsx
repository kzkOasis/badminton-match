"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="space-y-3 py-10 text-center">
      <h1 className="text-xl font-bold">エラーが発生しました</h1>
      <p className="text-muted-foreground text-sm">時間をおいて、もう一度お試しください。</p>
      <Button onClick={reset}>もう一度読み込む</Button>
    </div>
  );
}
