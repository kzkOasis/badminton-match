import { describe, expect, it } from "vitest";
import { applyButtonLabel, isActive } from "./participation";

describe("participation", () => {
  it("applyButtonLabel", () => {
    expect(applyButtonLabel({ full: false, hasWaitlist: false, requiresApproval: false })).toBe("参加する");
    expect(applyButtonLabel({ full: false, hasWaitlist: false, requiresApproval: true })).toBe("参加を申請する");
    expect(applyButtonLabel({ full: true, hasWaitlist: false, requiresApproval: false })).toBe(
      "キャンセル待ちに申し込む",
    );
    expect(applyButtonLabel({ full: false, hasWaitlist: true, requiresApproval: true })).toBe(
      "キャンセル待ちに申し込む",
    );
  });

  it("isActive", () => {
    expect(isActive("approved")).toBe(true);
    expect(isActive("waitlisted")).toBe(true);
    expect(isActive("rejected")).toBe(false);
    expect(isActive(null)).toBe(false);
  });
});
