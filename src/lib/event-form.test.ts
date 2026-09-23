import { describe, expect, it } from "vitest";
import { parseEventForm } from "./event-form";

const now = new Date("2026-09-23T00:00:00Z");

function fd(overrides: Record<string, string | undefined> = {}) {
  const base: Record<string, string | undefined> = {
    title: "平日夜のゲーム練習",
    date: "2026-10-01",
    start_time: "19:00",
    end_time: "21:00",
    venue: "船橋市総合体育館",
    prefecture: "千葉県",
    city: "船橋市",
    level_min: "novice",
    level_max: "intermediate",
    capacity: "6",
    fee: "500",
    description: "シャトルは用意します",
    requires_approval: "on",
    ...overrides,
  };
  const f = new FormData();
  for (const [k, v] of Object.entries(base)) if (v !== undefined) f.set(k, v);
  return f;
}

describe("parseEventForm", () => {
  it("正しい入力を DB に入れる形にする", () => {
    const r = parseEventForm(fd(), { now });
    expect(r).toEqual({
      ok: true,
      value: {
        title: "平日夜のゲーム練習",
        starts_at: "2026-10-01T10:00:00.000Z",
        ends_at: "2026-10-01T12:00:00.000Z",
        venue: "船橋市総合体育館",
        area: "千葉県船橋市",
        level_min: "novice",
        level_max: "intermediate",
        capacity: 6,
        fee: 500,
        description: "シャトルは用意します",
        requires_approval: true,
      },
    });
  });

  it("承認制のチェックなし・参加費空欄・レベル不問", () => {
    const r = parseEventForm(
      fd({ requires_approval: undefined, fee: "", level_min: "", level_max: "", description: "" }),
      { now },
    );
    expect(r.ok && r.value).toMatchObject({
      requires_approval: false,
      fee: 0,
      level_min: null,
      level_max: null,
      description: null,
    });
  });

  it("終了が開始より前・過去の日時はエラー", () => {
    const r1 = parseEventForm(fd({ end_time: "18:00" }), { now });
    expect(!r1.ok && r1.errors.end_time).toBeTruthy();
    const r2 = parseEventForm(fd({ date: "2026-09-01" }), { now });
    expect(!r2.ok && r2.errors.start_time).toBeTruthy();
    // 編集時に過去を許すオプション
    expect(parseEventForm(fd({ date: "2026-09-01" }), { now, requireFuture: false }).ok).toBe(true);
  });

  it("レベルの上限が下限より低いとエラー", () => {
    const r = parseEventForm(fd({ level_min: "advanced", level_max: "beginner" }), { now });
    expect(!r.ok && r.errors.level_max).toBeTruthy();
  });

  it("募集人数・参加費・都道府県の検証", () => {
    const r = parseEventForm(fd({ capacity: "0", fee: "-100", prefecture: "東京" }), { now });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.capacity).toBeTruthy();
      expect(r.errors.fee).toBeTruthy();
      expect(r.errors.prefecture).toBeTruthy();
    }
    expect(parseEventForm(fd({ capacity: "1.5" }), { now }).ok).toBe(false);
  });
});
