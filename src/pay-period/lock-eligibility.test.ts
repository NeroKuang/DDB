import { describe, expect, it } from "vitest";
import {
  describeLockBlockReasons,
  lockBlockMessage,
} from "@/pay-period/lock-eligibility";

describe("lock eligibility messages", () => {
  it("lists import and nickname reasons", () => {
    const reasons = describeLockBlockReasons({
      requiredImportsComplete: false,
      blockingUnmatchedNicknames: [{ nickname: "DDB單點", amount: 100 }],
    });
    expect(reasons).toHaveLength(2);
    expect(lockBlockMessage(reasons)).toContain("必要匯入未齊");
    expect(lockBlockMessage(reasons)).toContain("未對上暱稱");
  });
});
