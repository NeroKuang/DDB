import type { CheckoutNoteLine } from "@/import/parse-checkout";
import type {
  NoteAnalysisClick,
  NoteOuterItem,
} from "@/import/parse-note-analysis";
import type { PunchPair } from "@/import/parse-punches";
import { isInPayPeriod } from "@/lib/business-day";
import { businessDaysForPeriodKey } from "@/compile/period-catalog";

export function payPeriodBounds(periodKey: string): {
  start: Date;
  end: Date;
} {
  const businessDays = businessDaysForPeriodKey(periodKey);
  return {
    start: new Date(businessDays.startIso),
    end: new Date(businessDays.endIso),
  };
}

export function filterCheckoutLinesForPeriod(
  lines: CheckoutNoteLine[],
  periodKey: string
): CheckoutNoteLine[] {
  const { start, end } = payPeriodBounds(periodKey);
  return lines.filter((line) => isInPayPeriod(line.at, start, end));
}

export function filterPunchPairsForPeriod(
  pairs: PunchPair[],
  periodKey: string
): PunchPair[] {
  const { start, end } = payPeriodBounds(periodKey);
  return pairs.filter((pair) => isInPayPeriod(pair.clockIn, start, end));
}

/** Note drill-down has no timestamps; only keep when import belongs to this period. */
export function filterNoteClicksForPeriod(input: {
  noteClicks: NoteAnalysisClick[];
  importPeriodKey: string;
  targetPeriodKey: string;
}): NoteAnalysisClick[] {
  if (input.importPeriodKey === input.targetPeriodKey) {
    return input.noteClicks;
  }
  return [];
}

export function filterNoteOuterItemsForPeriod<T>(input: {
  noteOuterItems: T[];
  importPeriodKey: string;
  targetPeriodKey: string;
}): T[] {
  if (input.importPeriodKey === input.targetPeriodKey) {
    return input.noteOuterItems;
  }
  return [];
}

export function filterImportBundleForPeriod<
  T extends {
    periodKey: string;
    checkoutLines: CheckoutNoteLine[];
    punchPairs: PunchPair[];
    noteClicks: NoteAnalysisClick[];
    noteOuterItems?: NoteOuterItem[];
  },
>(
  bundle: T,
  targetPeriodKey: string,
  importPeriodKey = bundle.periodKey,
  options?: { punchPairsPreScoped?: boolean }
): T {
  return {
    ...bundle,
    periodKey: targetPeriodKey,
    checkoutLines: filterCheckoutLinesForPeriod(
      bundle.checkoutLines,
      targetPeriodKey
    ),
    punchPairs: options?.punchPairsPreScoped
      ? bundle.punchPairs
      : filterPunchPairsForPeriod(bundle.punchPairs, targetPeriodKey),
    noteClicks: filterNoteClicksForPeriod({
      noteClicks: bundle.noteClicks,
      importPeriodKey,
      targetPeriodKey,
    }),
    ...(bundle.noteOuterItems
      ? {
          noteOuterItems: filterNoteOuterItemsForPeriod({
            noteOuterItems: bundle.noteOuterItems,
            importPeriodKey,
            targetPeriodKey,
          }),
        }
      : {}),
  };
}
