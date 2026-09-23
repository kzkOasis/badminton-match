"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { type ChatMessage, mergeMessages, PAGE_SIZE, validateMessageBody } from "@/lib/chat";
import { formatDateTime, isoToJstParts } from "@/lib/datetime";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const COLUMNS = "id, event_id, user_id, body, created_at";

export function ChatRoom({
  eventId,
  meId,
  initialMessages,
  initialHasMore,
  names,
  canPost,
  closedReason,
}: {
  eventId: string;
  meId: string;
  initialMessages: ChatMessage[];
  initialHasMore: boolean;
  names: Record<string, string>;
  canPost: boolean;
  closedReason?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const latestAt = useRef(initialMessages.at(-1)?.created_at ?? null);

  const add = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((cur) => {
      const merged = mergeMessages(cur, incoming);
      latestAt.current = merged.at(-1)?.created_at ?? latestAt.current;
      return merged;
    });
  }, []);

  // Realtime: このイベントのメッセージの INSERT を購読する（RLS でメンバー以外には届かない）
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${eventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `event_id=eq.${eventId}` },
        (payload) => add([payload.new as ChatMessage]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, eventId, add]);

  // 画面に戻ったときは、取りこぼしがないように新しい分を取り直す
  useEffect(() => {
    async function catchUp() {
      if (document.visibilityState !== "visible") return;
      let q = supabase.from("messages").select(COLUMNS).eq("event_id", eventId).order("created_at").limit(200);
      if (latestAt.current) q = q.gt("created_at", latestAt.current);
      const { data } = await q;
      if (data) add(data);
    }
    document.addEventListener("visibilitychange", catchUp);
    return () => document.removeEventListener("visibilitychange", catchUp);
  }, [supabase, eventId, add]);

  // 新しいメッセージが来たら、一番下を見ているときだけ下までスクロールする
  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function onScroll() {
    const el = listRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  async function loadOlder() {
    const oldest = messages[0];
    if (!oldest) return;
    setLoadingOlder(true);
    const el = listRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const { data, error } = await supabase
      .from("messages")
      .select(COLUMNS)
      .eq("event_id", eventId)
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    setLoadingOlder(false);
    if (error) {
      setError("読み込めませんでした。");
      return;
    }
    setHasMore(data.length === PAGE_SIZE);
    stickToBottom.current = false;
    setMessages((cur) => mergeMessages(cur, data));
    // 読み込んだ分だけスクロール位置を保つ
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - prevHeight;
    });
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const invalid = validateMessageBody(body);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSending(true);
    setError(null);
    const { data, error } = await supabase
      .from("messages")
      .insert({ event_id: eventId, body: body.trim() })
      .select(COLUMNS)
      .single();
    setSending(false);
    if (error) {
      setError("送信できませんでした。イベントが中止されたか、参加が取り消された可能性があります。");
      return;
    }
    stickToBottom.current = true;
    add([data]);
    setBody("");
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={listRef}
        onScroll={onScroll}
        className="bg-muted/30 h-[calc(100dvh-17rem)] min-h-64 space-y-3 overflow-y-auto rounded-xl border p-3"
      >
        {hasMore && (
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={loadOlder} disabled={loadingOlder}>
              {loadingOlder ? "読み込んでいます…" : "もっと見る"}
            </Button>
          </div>
        )}
        {messages.length === 0 && (
          <p className="text-muted-foreground py-10 text-center text-sm">
            まだメッセージはありません。集合場所や持ち物の連絡に使ってください。
          </p>
        )}
        {messages.map((m, i) => {
          const mine = m.user_id === meId;
          const { date, time } = isoToJstParts(m.created_at);
          const prev = messages[i - 1];
          const showDate = !prev || isoToJstParts(prev.created_at).date !== date;
          return (
            <div key={m.id}>
              {showDate && (
                <div className="text-muted-foreground my-2 text-center text-xs">
                  {formatDateTime(m.created_at).split(" ")[0]}
                </div>
              )}
              <div className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                {!mine && (
                  <span className="text-muted-foreground mb-0.5 text-xs">
                    {names[m.user_id] ?? "退出したメンバー"}
                  </span>
                )}
                <div className={cn("flex items-end gap-1.5", mine && "flex-row-reverse")}>
                  <p
                    className={cn(
                      "max-w-[75vw] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words sm:max-w-md",
                      mine ? "bg-primary text-primary-foreground" : "bg-card border",
                    )}
                  >
                    {m.body}
                  </p>
                  <span className="text-muted-foreground text-[10px]">{time}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {canPost ? (
        <form onSubmit={send} className="flex items-end gap-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(e);
            }}
            rows={2}
            maxLength={1000}
            placeholder="メッセージを入力"
            aria-label="メッセージ"
            className="max-h-40 min-h-10"
          />
          <Button type="submit" disabled={sending || body.trim() === ""}>
            送信
          </Button>
        </form>
      ) : (
        <p className="text-muted-foreground text-center text-sm">{closedReason}</p>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
