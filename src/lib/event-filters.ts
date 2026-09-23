import { jstDayRange } from "./datetime";
import { isLevel, type Level } from "./levels";
import { isPrefecture, type Prefecture } from "./prefectures";

export type EventFilters = {
  prefecture: Prefecture | "";
  date: string;
  level: Level | "";
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export function parseEventFilters(sp: SearchParams): EventFilters {
  const prefecture = first(sp.prefecture);
  const date = first(sp.date);
  const level = first(sp.level);
  return {
    prefecture: isPrefecture(prefecture) ? prefecture : "",
    date: jstDayRange(date) ? date : "",
    level: isLevel(level) ? level : "",
  };
}
