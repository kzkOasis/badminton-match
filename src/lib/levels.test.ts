import { describe, expect, it } from "vitest";
import { levelRangeLabel, levelsFrom, levelsUpTo } from "./levels";

describe("levels", () => {
  it("levelsUpTo / levelsFrom", () => {
    expect(levelsUpTo("novice")).toEqual(["beginner", "novice"]);
    expect(levelsFrom("intermediate")).toEqual(["intermediate", "advanced"]);
  });

  it("levelRangeLabel", () => {
    expect(levelRangeLabel(null, null)).toBe("レベル不問");
    expect(levelRangeLabel("novice", "intermediate")).toBe("初級〜中級");
    expect(levelRangeLabel("advanced", "advanced")).toBe("上級");
    expect(levelRangeLabel("intermediate", null)).toBe("中級以上");
    expect(levelRangeLabel(null, "novice")).toBe("初級まで");
  });
});
