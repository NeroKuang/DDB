export type UnmatchedNicknameRow = {
  nickname: string;
  amount: number;
};

/** Zero-amount unmatched lines do not block lock. */
export function isAutoSkippedUnmatched(amount: number): boolean {
  return amount === 0;
}

export function isBlockingUnmatched(
  item: UnmatchedNicknameRow,
  adminSkippedNicknames: readonly string[]
): boolean {
  if (isAutoSkippedUnmatched(item.amount)) {
    return false;
  }
  return !adminSkippedNicknames.includes(item.nickname);
}

export function blockingUnmatchedNicknames(
  items: readonly UnmatchedNicknameRow[],
  adminSkippedNicknames: readonly string[] = []
): UnmatchedNicknameRow[] {
  return items.filter((item) =>
    isBlockingUnmatched(item, adminSkippedNicknames)
  );
}

export function computeLockEligible(input: {
  unmatchedNicknames: readonly UnmatchedNicknameRow[];
  adminSkippedNicknames?: readonly string[];
  noteOuterComplete: boolean;
}): boolean {
  return (
    blockingUnmatchedNicknames(
      input.unmatchedNicknames,
      input.adminSkippedNicknames ?? []
    ).length === 0 && input.noteOuterComplete
  );
}
