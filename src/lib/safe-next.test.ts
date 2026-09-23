import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("サイト内のパスはそのまま通す", () => {
    expect(safeNext("/events/abc?x=1")).toBe("/events/abc?x=1");
  });

  it("外部URL・プロトコル相対URLは既定値にする", () => {
    expect(safeNext("https://evil.example")).toBe("/events");
    expect(safeNext("//evil.example")).toBe("/events");
    expect(safeNext("/\\evil.example")).toBe("/events");
    expect(safeNext(null, "/me")).toBe("/me");
  });
});
