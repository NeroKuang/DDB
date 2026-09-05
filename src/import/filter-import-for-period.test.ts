import { describe, expect, it } from "vitest";
import { parseCheckoutFile } from "@/import/parse-checkout";
import {
  filterCheckoutLinesForPeriod,
  filterImportBundleForPeriod,
} from "@/import/filter-import-for-period";
import { july2026FixturePaths } from "@/lib/july-2026-fixtures";
import { getPeriodCatalogEntry } from "@/compile/period-catalog";

describe("filterImportForPeriod", () => {
  it("re-filters a wide export down to June business days", async () => {
    const paths = july2026FixturePaths();
    const julyBounds = getPeriodCatalogEntry("2026-07").businessDays;
    const wideEnd = new Date(julyBounds.endIso);
    const wideStart = new Date(
      getPeriodCatalogEntry("2026-06").businessDays.startIso
    );
    const allLines = await parseCheckoutFile(paths.checkout, {
      start: wideStart,
      end: wideEnd,
    });

    const juneOnly = filterCheckoutLinesForPeriod(allLines, "2026-06");
    const julyOnly = filterCheckoutLinesForPeriod(allLines, "2026-07");

    expect(juneOnly.length).toBeGreaterThan(0);
    expect(julyOnly.length).toBeGreaterThan(juneOnly.length);

    const bundle = filterImportBundleForPeriod(
      {
        periodKey: "2026-07",
        checkoutLines: allLines,
        punchPairs: [],
        noteClicks: [{ itemName: "修女貪杯", nickname: "粉冥", clicks: 3 }],
      },
      "2026-06",
      "2026-07"
    );
    expect(bundle.checkoutLines.length).toBe(juneOnly.length);
    expect(bundle.noteClicks).toEqual([]);
  });

  it("keeps DB punch pairs when already scoped to the target period", () => {
    const pairs = [
      {
        nickname: "小妍",
        hours: 16.13,
        clockIn: new Date(0),
        clockOut: new Date(0),
      },
    ];
    const kept = filterImportBundleForPeriod(
      {
        periodKey: "2026-08",
        checkoutLines: [],
        punchPairs: pairs,
        noteClicks: [],
      },
      "2026-08",
      "2026-08",
      { punchPairsPreScoped: true }
    );
    expect(kept.punchPairs).toEqual(pairs);

    const filtered = filterImportBundleForPeriod(
      {
        periodKey: "2026-08",
        checkoutLines: [],
        punchPairs: pairs,
        noteClicks: [],
      },
      "2026-08",
      "2026-08"
    );
    expect(filtered.punchPairs).toEqual([]);
  });
});
