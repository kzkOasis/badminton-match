export type ChatMessage = {
  id: string;
  event_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export const PAGE_SIZE = 50;

/** id で重複を除き、古い順に並べる（Realtime と送信結果が二重に届いても1件にする） */
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  );
}

export function validateMessageBody(body: string): string | null {
  const len = [...body.trim()].length;
  if (len === 0) return "メッセージを入力してください";
  if (len > 1000) return "メッセージは1000文字以内にしてください";
  return null;
}
