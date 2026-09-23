import { describe, expect, it } from "vitest";
import { parseEventFilters } from "./event-filters";

describe("parseEventFilters", () => {
  it("正しい値だけを残す", () => {
    expect(parseEventFilters({ prefecture: "千葉県", date: "2026-10-01", level: "novice" })).toEqual({
      prefecture: "千葉県",
      date: "2026-10-01",
      level: "novice",
    });
    expect(parseEventFilters({ prefecture: "x", date: "2026-13-01", level: ["pro"] })).toEqual({
      prefecture: "",
      date: "",
      level: "",
    });
  });
});
