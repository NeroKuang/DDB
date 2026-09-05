import { describe, expect, it } from "vitest";
import {
  blockingUnmatchedNicknames,
  computeLockEligible,
  isAutoSkippedUnmatched,
} from "@/compile/unmatched-nicknames";

describe("unmatched nicknames lock rules", () => {
  const rows = [
    { nickname: "DDB單點", amount: 615 },
    { nickname: "幽靈", amount: 0 },
    { nickname: "測試", amount: 100 },
  ];

  it("auto-skips zero amounts", () => {
    expect(isAutoSkippedUnmatched(0)).toBe(true);
    expect(isAutoSkippedUnmatched(1)).toBe(false);
    expect(blockingUnmatchedNicknames(rows)).toEqual([
      { nickname: "DDB單點", amount: 615 },
      { nickname: "測試", amount: 100 },
    ]);
  });

  it("honors admin-skipped nicknames", () => {
    expect(blockingUnmatchedNicknames(rows, ["DDB單點"])).toEqual([
      { nickname: "測試", amount: 100 },
    ]);
  });

  it("computes lock eligibility", () => {
    expect(
      computeLockEligible({
        unmatchedNicknames: rows,
        noteOuterComplete: true,
      })
    ).toBe(false);
    expect(
      computeLockEligible({
        unmatchedNicknames: rows,
        adminSkippedNicknames: ["DDB單點", "測試"],
        noteOuterComplete: true,
      })
    ).toBe(true);
    expect(
      computeLockEligible({
        unmatchedNicknames: [{ nickname: "幽靈", amount: 0 }],
        noteOuterComplete: false,
      })
    ).toBe(false);
  });
});
