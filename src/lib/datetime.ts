// 日時はすべて日本時間（UTC+9、サマータイムなし）で扱う
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** "2026-10-01" と "19:00"（日本時間）を ISO 文字列にする。不正なら null */
export function jstToIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const d = new Date(`${date}T${time}:00+09:00`);
  if (Number.isNaN(d.getTime())) return null;
  // 2026-02-30 のような存在しない日付を弾く
  if (isoToJstParts(d.toISOString()).date !== date) return null;
  return d.toISOString();
}

function shifted(iso: string | Date): Date {
  return new Date(new Date(iso).getTime() + JST_OFFSET_MS);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO 文字列を日本時間の日付 "YYYY-MM-DD" と時刻 "HH:mm" に分ける */
export function isoToJstParts(iso: string | Date): { date: string; time: string } {
  const d = shifted(iso);
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
  };
}

/** 日本時間の今日 "YYYY-MM-DD" */
export function todayJst(now: Date = new Date()): string {
  return isoToJstParts(now).date;
}

/** 日本時間のその日の 0:00〜翌 0:00（ISO） */
export function jstDayRange(date: string): { from: string; to: string } | null {
  const from = jstToIso(date, "00:00");
  if (!from) return null;
  const to = new Date(new Date(from).getTime() + 24 * 60 * 60 * 1000).toISOString();
  return { from, to };
}

/** "10/1(水) 19:00" */
export function formatDateTime(iso: string): string {
  const d = shifted(iso);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${WEEKDAYS[d.getUTCDay()]}) ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** "10/1(水) 19:00〜21:00"。日をまたぐときは終了側にも日付を付ける */
export function formatDateTimeRange(startIso: string, endIso: string): string {
  const start = isoToJstParts(startIso);
  const end = isoToJstParts(endIso);
  return start.date === end.date
    ? `${formatDateTime(startIso)}〜${end.time}`
    : `${formatDateTime(startIso)}〜${formatDateTime(endIso)}`;
}
