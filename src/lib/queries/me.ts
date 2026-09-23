import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** ヘッダーのバッジ用: 主催イベントの承認待ち件数と、自分の申し込みの状態変化件数 */
export const getActionCounts = cache(async (userId: string) => {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const [hostPending, updates] = await Promise.all([
    supabase
      .from("participations")
      .select("id, event:events!participations_event_id_fkey!inner(host_id, status, starts_at)", {
        count: "exact",
        head: true,
      })
      .eq("status", "pending")
      .eq("event.host_id", userId)
      .eq("event.status", "open")
      .gt("event.starts_at", now),
    supabase
      .from("participations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("has_update", true),
  ]);
  const pending = hostPending.count ?? 0;
  const changed = updates.count ?? 0;
  return { pending, changed, total: pending + changed };
});
