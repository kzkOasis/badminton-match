"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelEvent } from "../../actions";

export function CancelEventButton({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function onClick() {
    if (!window.confirm("このイベントを中止しますか？中止すると元に戻せません。")) return;
    startTransition(async () => {
      const res = await cancelEvent(eventId);
      if (res?.message) setMessage(res.message);
    });
  }

  return (
    <div className="space-y-2">
      <Button variant="destructive" onClick={onClick} disabled={pending} className="w-full">
        {pending ? "中止しています…" : "イベントを中止する"}
      </Button>
      {message && <p className="text-destructive text-sm">{message}</p>}
    </div>
  );
}
