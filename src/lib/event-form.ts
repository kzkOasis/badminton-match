import { jstToIso } from "./datetime";
import { type FieldErrors, type ParseResult, text } from "./form";
import { isLevel, type Level, levelRank } from "./levels";
import { isPrefecture } from "./prefectures";

export type EventInput = {
  title: string;
  starts_at: string;
  ends_at: string;
  venue: string;
  area: string;
  level_min: Level | null;
  level_max: Level | null;
  capacity: number;
  fee: number;
  description: string | null;
  requires_approval: boolean;
};

export type EventFormField =
  | "title"
  | "date"
  | "start_time"
  | "end_time"
  | "venue"
  | "prefecture"
  | "city"
  | "level_min"
  | "level_max"
  | "capacity"
  | "fee"
  | "description";

const len = (s: string) => [...s].length;

function parseInteger(s: string): number | null {
  if (!/^\d+$/.test(s)) return null;
  return Number(s);
}

export function parseEventForm(
  formData: FormData,
  opts: { now?: Date; requireFuture?: boolean } = {},
): ParseResult<EventInput, EventFormField> {
  const now = opts.now ?? new Date();
  const errors: FieldErrors<EventFormField> = {};

  const title = text(formData, "title");
  const date = text(formData, "date");
  const startTime = text(formData, "start_time");
  const endTime = text(formData, "end_time");
  const venue = text(formData, "venue");
  const prefecture = text(formData, "prefecture");
  const city = text(formData, "city");
  const levelMin = text(formData, "level_min");
  const levelMax = text(formData, "level_max");
  const capacityStr = text(formData, "capacity");
  const feeStr = text(formData, "fee") || "0";
  const description = text(formData, "description");
  const requiresApproval = formData.get("requires_approval") === "on";

  if (!title) errors.title = "タイトルを入力してください";
  else if (len(title) > 60) errors.title = "タイトルは60文字以内にしてください";

  const startsAt = jstToIso(date, startTime);
  const endsAt = jstToIso(date, endTime);
  if (!date) errors.date = "開催日を入力してください";
  else if (!jstToIso(date, "00:00")) errors.date = "開催日が正しくありません";
  if (!startTime || (date && !startsAt)) errors.start_time = "開始時刻を入力してください";
  if (!endTime || (date && !endsAt)) errors.end_time = "終了時刻を入力してください";
  if (startsAt && endsAt) {
    if (endsAt <= startsAt) errors.end_time = "終了時刻は開始時刻より後にしてください";
    else if (opts.requireFuture !== false && new Date(startsAt) <= now)
      errors.start_time = "開始日時は現在より後にしてください";
  }

  if (!venue) errors.venue = "会場を入力してください";
  else if (len(venue) > 100) errors.venue = "会場は100文字以内にしてください";

  if (!isPrefecture(prefecture)) errors.prefecture = "都道府県を選んでください";
  const area = `${prefecture}${city}`;
  if (len(city) > 40 || len(area) > 50) errors.city = "市区町村は40文字以内にしてください";

  if (levelMin && !isLevel(levelMin)) errors.level_min = "レベルが正しくありません";
  if (levelMax && !isLevel(levelMax)) errors.level_max = "レベルが正しくありません";
  if (isLevel(levelMin) && isLevel(levelMax) && levelRank(levelMin) > levelRank(levelMax)) {
    errors.level_max = "上限は下限以上のレベルにしてください";
  }

  const capacity = parseInteger(capacityStr);
  if (capacity === null || capacity < 1 || capacity > 100)
    errors.capacity = "募集人数は1〜100人で入力してください";

  const fee = parseInteger(feeStr);
  if (fee === null || fee > 100000) errors.fee = "参加費は0〜100,000円で入力してください";

  if (len(description) > 2000) errors.description = "説明は2000文字以内にしてください";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title,
      starts_at: startsAt!,
      ends_at: endsAt!,
      venue,
      area,
      level_min: isLevel(levelMin) ? levelMin : null,
      level_max: isLevel(levelMax) ? levelMax : null,
      capacity: capacity!,
      fee: fee!,
      description: description || null,
      requires_approval: requiresApproval,
    },
  };
}
