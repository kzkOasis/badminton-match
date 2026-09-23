import { describe, expect, it } from "vitest";
import { type ChatMessage, mergeMessages, validateMessageBody } from "./chat";

const m = (id: string, at: string): ChatMessage => ({
  id,
  event_id: "e",
  user_id: "u",
  body: id,
  created_at: at,
});

describe("chat", () => {
  it("mergeMessages は重複を除いて古い順に並べる", () => {
    const a = m("a", "2026-10-01T10:00:00Z");
    const b = m("b", "2026-10-01T10:01:00Z");
    const c = m("c", "2026-10-01T09:59:00Z");
    expect(mergeMessages([a, b], [b, c]).map((x) => x.id)).toEqual(["c", "a", "b"]);
  });

  it("validateMessageBody", () => {
    expect(validateMessageBody("  ")).not.toBeNull();
    expect(validateMessageBody("こんにちは")).toBeNull();
    expect(validateMessageBody("あ".repeat(1001))).not.toBeNull();
  });
});
