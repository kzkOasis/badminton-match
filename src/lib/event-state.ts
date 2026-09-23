import type { EventSummary } from "@/lib/queries/events";

export function isFull(e: Pick<EventSummary, "approved_count" | "capacity">): boolean {
  return e.approved_count >= e.capacity;
}

export function hasStarted(e: Pick<EventSummary, "starts_at">, now: Date = new Date()): boolean {
  return new Date(e.starts_at) <= now;
}

export function feeLabel(fee: number): string {
  return fee === 0 ? "無料" : `${fee.toLocaleString("ja-JP")}円（現地払い）`;
}
