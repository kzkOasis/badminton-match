import { describe, expect, it } from "vitest";
import { parseProfileForm } from "./profile";

function fd(obj: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, v);
  return f;
}

describe("parseProfileForm", () => {
  it("正しい入力を受け付け、空欄は null にする", () => {
    const r = parseProfileForm(fd({ display_name: " たろう ", level: "novice", area: "", bio: "" }));
    expect(r).toEqual({
      ok: true,
      value: { display_name: "たろう", level: "novice", area: null, bio: null },
    });
  });

  it("表示名なし・不正なレベルはエラー", () => {
    const r = parseProfileForm(fd({ display_name: "  ", level: "pro" }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.display_name).toBeDefined();
      expect(r.errors.level).toBeDefined();
    }
  });

  it("表示名は30文字まで（絵文字も1文字と数える）", () => {
    expect(parseProfileForm(fd({ display_name: "🏸".repeat(30), level: "beginner" })).ok).toBe(true);
    expect(parseProfileForm(fd({ display_name: "あ".repeat(31), level: "beginner" })).ok).toBe(false);
  });
});
