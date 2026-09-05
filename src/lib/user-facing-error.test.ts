import { describe, expect, it } from "vitest";
import { toUserFacingMessage } from "@/lib/user-facing-error";

describe("toUserFacingMessage", () => {
  it("passes through short Chinese business errors", () => {
    expect(
      toUserFacingMessage(new Error("本期已鎖定，請先解鎖再修改"), "fallback")
    ).toBe("本期已鎖定，請先解鎖再修改");
  });

  it("hides technical invalid and prisma errors", () => {
    expect(toUserFacingMessage(new Error("invalid"), "操作失敗")).toBe(
      "操作失敗"
    );
    expect(
      toUserFacingMessage(
        new Error("Invalid `prisma.payPeriod.update()` invocation"),
        "操作失敗"
      )
    ).toBe("操作失敗");
  });
});
