import type { UnmatchedNicknameRow } from "@/compile/unmatched-nicknames";

export function describeLockBlockReasons(input: {
  requiredImportsComplete: boolean;
  blockingUnmatchedNicknames: readonly UnmatchedNicknameRow[];
}): string[] {
  const reasons: string[] = [];
  if (!input.requiredImportsComplete) {
    reasons.push("必要匯入未齊（結帳、打卡、注記分析全品項明細）");
  }
  if (input.blockingUnmatchedNicknames.length > 0) {
    reasons.push(
      `仍有 ${input.blockingUnmatchedNicknames.length} 個未對上暱稱阻擋鎖定`
    );
  }
  return reasons;
}

export function lockBlockMessage(reasons: readonly string[]): string {
  if (reasons.length === 0) {
    return "目前不符合鎖定條件。";
  }
  return reasons.join("；");
}
