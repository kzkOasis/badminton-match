"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { applyButtonLabel } from "@/lib/participation";
import { type ActionResult, applyToEvent, cancelParticipation } from "./participation-actions";

type Props = {
  eventId: string;
  status: string | null;
  waitlistPosition: number | null;
  full: boolean;
  hasWaitlist: boolean;
  requiresApproval: boolean;
};

function CancelButton({ eventId, label, confirmText }: { eventId: string; label: string; confirmText: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult>({});
  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        className="w-full"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(confirmText)) return;
          startTransition(async () => setResult(await cancelParticipation(eventId)));
        }}
      >
        {pending ? "処理しています…" : label}
      </Button>
      {result.message && !result.ok && <p className="text-destructive text-sm">{result.message}</p>}
    </div>
  );
}

function ApplyForm(props: Props) {
  const [state, action, pending] = useActionState(applyToEvent.bind(null, props.eventId), {});
  const label = applyButtonLabel(props);
  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="message" className="text-sm font-medium">
          主催者へのメッセージ（任意）
        </label>
        <Textarea
          id="message"
          name="message"
          rows={3}
          maxLength={500}
          placeholder="例: 初参加です。ダブルスの経験は2年ほどです。"
        />
      </div>
      {props.full || props.hasWaitlist ? (
        <p className="text-muted-foreground text-xs">
          満員のため、キャンセル待ちとして申し込みます。空きが出たら順番に繰り上がります
          {props.requiresApproval && "（繰り上げ後に主催者の承認が必要です）"}。
        </p>
      ) : props.requiresApproval ? (
        <p className="text-muted-foreground text-xs">承認制のイベントです。主催者が承認すると参加確定になります。</p>
      ) : (
        <p className="text-muted-foreground text-xs">先着順です。申し込むとすぐに参加確定になります。</p>
      )}
      {state.message && !state.ok && <p className="text-destructive text-sm">{state.message}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "申し込んでいます…" : label}
      </Button>
    </form>
  );
}

export function ParticipationPanel(props: Props) {
  const { eventId, status } = props;

  if (status === "approved") {
    return (
      <div className="space-y-3">
        <p className="font-semibold text-emerald-700 dark:text-emerald-400">参加が確定しています</p>
        <Button asChild className="w-full">
          <Link href={`/events/${eventId}/chat`}>チャットを開く</Link>
        </Button>
        <CancelButton
          eventId={eventId}
          label="参加をキャンセルする"
          confirmText="参加をキャンセルしますか？キャンセル待ちの人がいれば、その人が繰り上がります。"
        />
      </div>
    );
  }
  if (status === "pending") {
    return (
      <div className="space-y-3">
        <p className="font-semibold">主催者の承認待ちです</p>
        <p className="text-muted-foreground text-sm">承認されると参加確定になり、チャットに参加できます。</p>
        <CancelButton eventId={eventId} label="申請を取り下げる" confirmText="申請を取り下げますか？" />
      </div>
    );
  }
  if (status === "waitlisted") {
    return (
      <div className="space-y-3">
        <p className="font-semibold">
          キャンセル待ち{props.waitlistPosition ? `（${props.waitlistPosition}番目）` : ""}です
        </p>
        <p className="text-muted-foreground text-sm">
          空きが出たら順番に繰り上がります
          {props.requiresApproval ? "。繰り上がったあと、主催者が承認すると参加確定です。" : "。"}
        </p>
        <CancelButton eventId={eventId} label="キャンセル待ちをやめる" confirmText="キャンセル待ちをやめますか？" />
      </div>
    );
  }
  if (status === "rejected") {
    return <p className="text-muted-foreground text-sm">今回は参加を見送られました。</p>;
  }
  return <ApplyForm {...props} />;
}
