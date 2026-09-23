/** ログイン後の戻り先として安全なパスだけを通す（外部サイトへのリダイレクトを防ぐ） */
export function safeNext(next: string | null | undefined, fallback = "/events"): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
