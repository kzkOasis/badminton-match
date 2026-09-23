export const PARTICIPATION_STATUSES = [
  "pending",
  "approved",
  "waitlisted",
  "rejected",
  "cancelled",
] as const;
export type ParticipationStatus = (typeof PARTICIPATION_STATUSES)[number];

export const STATUS_LABELS: Record<ParticipationStatus, string> = {
  pending: "承認待ち",
  approved: "参加確定",
  waitlisted: "キャンセル待ち",
  rejected: "見送り",
  cancelled: "キャンセル済み",
};

/** いま申し込み中（取り消せる）状態か */
export function isActive(status: string | null | undefined): boolean {
  return status === "pending" || status === "approved" || status === "waitlisted";
}

/** 申込ボタンの文言。DB 関数の判定（満員・キャンセル待ちあり → 待ち、承認制 → 申請）と揃える */
export function applyButtonLabel(opts: {
  full: boolean;
  hasWaitlist: boolean;
  requiresApproval: boolean;
}): string {
  if (opts.full || opts.hasWaitlist) return "キャンセル待ちに申し込む";
  if (opts.requiresApproval) return "参加を申請する";
  return "参加する";
}

export const APPLY_RESULT_MESSAGES: Record<string, string> = {
  approved: "参加が確定しました。",
  pending: "申請しました。主催者の承認をお待ちください。",
  waitlisted: "キャンセル待ちに登録しました。空きが出たら順番に繰り上がります。",
};
