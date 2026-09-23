import { describe, expect, it } from "vitest";
import {
  formatDateTime,
  formatDateTimeRange,
  isoToJstParts,
  jstDayRange,
  jstToIso,
  todayJst,
} from "./datetime";

describe("datetime", () => {
  it("日本時間の入力を UTC の ISO にする", () => {
    expect(jstToIso("2026-10-01", "19:00")).toBe("2026-10-01T10:00:00.000Z");
    expect(jstToIso("2026-10-01", "08:30")).toBe("2026-09-30T23:30:00.000Z");
  });

  it("存在しない日付・形式違いは null", () => {
    expect(jstToIso("2026-02-30", "10:00")).toBeNull();
    expect(jstToIso("2026/10/01", "10:00")).toBeNull();
    expect(jstToIso("2026-10-01", "25:00")).toBeNull();
  });

  it("ISO を日本時間の日付・時刻に分ける", () => {
    expect(isoToJstParts("2026-09-30T23:30:00.000Z")).toEqual({ date: "2026-10-01", time: "08:30" });
  });

  it("日本時間の今日", () => {
    expect(todayJst(new Date("2026-09-30T15:00:00Z"))).toBe("2026-10-01");
    expect(todayJst(new Date("2026-09-30T14:59:59Z"))).toBe("2026-09-30");
  });

  it("その日の範囲", () => {
    expect(jstDayRange("2026-10-01")).toEqual({
      from: "2026-09-30T15:00:00.000Z",
      to: "2026-10-01T15:00:00.000Z",
    });
    expect(jstDayRange("x")).toBeNull();
  });

  it("表示用の書式", () => {
    expect(formatDateTime("2026-10-01T10:00:00Z")).toBe("10/1(木) 19:00");
    expect(formatDateTimeRange("2026-10-01T10:00:00Z", "2026-10-01T12:30:00Z")).toBe(
      "10/1(木) 19:00〜21:30",
    );
    expect(formatDateTimeRange("2026-10-01T13:00:00Z", "2026-10-01T16:00:00Z")).toBe(
      "10/1(木) 22:00〜10/2(金) 01:00",
    );
  });
});
