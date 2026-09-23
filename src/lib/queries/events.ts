import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Views } from "@/lib/database.types";
import { jstDayRange } from "@/lib/datetime";
import type { EventFilters } from "@/lib/event-filters";
import { levelsFrom, levelsUpTo } from "@/lib/levels";

export type EventSummary = Views<"event_summaries">;

type Client = SupabaseClient<Database>;

/** これから開催される（まだ始まっていない）募集中のイベント。開催日順 */
export async function listUpcomingEvents(
  supabase: Client,
  filters: Partial<EventFilters> = {},
  limit = 50,
): Promise<EventSummary[]> {
  let query = supabase
    .from("event_summaries")
    .select("*")
    .eq("status", "open")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (filters.prefecture) query = query.like("area", `${filters.prefecture}%`);
  if (filters.date) {
    const range = jstDayRange(filters.date);
    if (range) query = query.gte("starts_at", range.from).lt("starts_at", range.to);
  }
  if (filters.level) {
    // イベントの対象レベル [level_min, level_max] に、指定レベルが入るもの
    query = query
      .or(`level_min.is.null,level_min.in.(${levelsUpTo(filters.level).join(",")})`)
      .or(`level_max.is.null,level_max.in.(${levelsFrom(filters.level).join(",")})`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getEventSummary(supabase: Client, id: string): Promise<EventSummary | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await supabase.from("event_summaries").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}
