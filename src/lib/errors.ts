// DB 関数・トリガーが raise するエラーコード → 画面に出す文言
const MESSAGES: Record<string, string> = {
  not_authenticated: "ログインしてください。",
  profile_required: "先にプロフィールを登録してください。",
  event_not_found: "イベントが見つかりません。",
  event_cancelled: "このイベントは中止されています。",
  event_started: "開始時刻を過ぎたため、この操作はできません。",
  host_cannot_apply: "主催者は自分のイベントに申し込めません。",
  already_applied: "すでに申し込んでいます。",
  rejected: "このイベントへの申し込みは見送られました。",
  not_participating: "このイベントに申し込んでいません。",
  participation_not_found: "申し込みが見つかりません。",
  not_host: "主催者だけが操作できます。",
  event_full: "満員のため承認できません。キャンセル待ちに回してください。",
  event_not_full: "空きがあるため、キャンセル待ちには回せません。",
  invalid_transition: "この申し込みは、すでに状態が変わっています。画面を更新してください。",
  invalid_decision: "操作が正しくありません。",
  capacity_below_approved: "募集人数は、いまの参加確定人数より少なくできません。",
  host_immutable: "主催者は変更できません。",
};

export const GENERIC_ERROR = "うまくいきませんでした。時間をおいてもう一度お試しください。";

/** Supabase のエラーから、利用者向けの文言を作る */
export function errorMessage(error: { message?: string } | null | undefined): string {
  const msg = error?.message ?? "";
  for (const [code, text] of Object.entries(MESSAGES)) {
    if (msg === code || msg.includes(code)) return text;
  }
  return GENERIC_ERROR;
}
