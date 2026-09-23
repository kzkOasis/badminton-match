"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { type Decision, decideParticipation } from "./actions";

const CONFIRM: Partial<Record<Decision, string>> = {
  reject: "この申し込みを見送りますか？相手には「見送り」と表示されます。",
};

export function DecisionButtons({
  eventId,
  participationId,
  status,
  full,
}: {
  eventId: string;
  participationId: string;
  status: "pending" | "waitlisted";
  full: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function run(decision: Decision) {
    const confirmText = CONFIRM[decision];
    if (confirmText && !window.confirm(confirmText)) return;
    setMessage(null);
    startTransition(async () => {
      const res = await decideParticipation(eventId, participationId, decision);
      if (res.message) setMessage(res.message);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending || full} onClick={() => run("approve")}>
          承認する
        </Button>
        {status === "pending" && full && (
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => run("waitlist")}>
            キャンセル待ちに回す
          </Button>
        )}
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run("reject")}>
          見送る
        </Button>
      </div>
      {full && status === "pending" && (
        <p className="text-muted-foreground text-xs">満員のため承認できません。</p>
      )}
      {message && <p className="text-destructive text-sm">{message}</p>}
    </div>
  );
}
