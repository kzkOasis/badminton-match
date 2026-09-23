export const LEVELS = ["beginner", "novice", "intermediate", "advanced"] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABELS: Record<Level, string> = {
  beginner: "初心者",
  novice: "初級",
  intermediate: "中級",
  advanced: "上級",
};

export function isLevel(value: unknown): value is Level {
  return typeof value === "string" && (LEVELS as readonly string[]).includes(value);
}

export function levelRank(level: Level): number {
  return LEVELS.indexOf(level) + 1;
}

/** min 以下のレベル（min を含む）。一覧の絞り込みに使う */
export function levelsUpTo(level: Level): Level[] {
  return LEVELS.slice(0, levelRank(level));
}

/** level 以上のレベル（level を含む） */
export function levelsFrom(level: Level): Level[] {
  return LEVELS.slice(levelRank(level) - 1);
}

export function levelRangeLabel(min: string | null, max: string | null): string {
  const lo = isLevel(min) ? LEVEL_LABELS[min] : null;
  const hi = isLevel(max) ? LEVEL_LABELS[max] : null;
  if (!lo && !hi) return "レベル不問";
  if (lo && hi) return lo === hi ? lo : `${lo}〜${hi}`;
  if (lo) return `${lo}以上`;
  return `${hi}まで`;
}
