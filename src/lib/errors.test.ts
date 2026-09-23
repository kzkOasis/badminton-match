import { describe, expect, it } from "vitest";
import { errorMessage, GENERIC_ERROR } from "./errors";

describe("errorMessage", () => {
  it("DB のエラーコードを文言にする", () => {
    expect(errorMessage({ message: "event_full" })).toMatch(/満員/);
    expect(errorMessage({ message: "capacity_below_approved" })).toMatch(/募集人数/);
  });

  it("知らないエラーは汎用の文言", () => {
    expect(errorMessage({ message: "connection reset" })).toBe(GENERIC_ERROR);
    expect(errorMessage(null)).toBe(GENERIC_ERROR);
  });
});
