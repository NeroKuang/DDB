import { describe, expect, it } from "vitest";
import { loadPeriodImports } from "@/compile/load-period-imports";
import { parseCheckoutFile } from "@/import/parse-checkout";
import { july2026FixturePaths } from "@/lib/july-2026-fixtures";
import { getPeriodCatalogEntry } from "@/compile/period-catalog";
import { roundMoney } from "@/lib/money";
import { JULY_2026_PERIOD_KEY } from "@/lib/period-keys";

function sumSales(lines: { amount: number; voided: boolean }[]): number {
  return roundMoney(
    lines
      .filter((line) => !line.voided)
      .reduce((sum, line) => sum + line.amount, 0)
  );
}

describe("period import isolation (noon business-day cut)", () => {
  it("filters the shared July fixture checkout file per 薪資期間", async () => {
    const paths = july2026FixturePaths();
    const june = getPeriodCatalogEntry("2026-06");
    const july = getPeriodCatalogEntry("2026-07");
    const august = getPeriodCatalogEntry("2026-08");

    const juneLines = await parseCheckoutFile(paths.checkout, {
      start: new Date(june.businessDays.startIso),
      end: new Date(june.businessDays.endIso),
    });
    const julyLines = await parseCheckoutFile(paths.checkout, {
      start: new Date(july.businessDays.startIso),
      end: new Date(july.businessDays.endIso),
    });
    const augustLines = await parseCheckoutFile(paths.checkout, {
      start: new Date(august.businessDays.startIso),
      end: new Date(august.businessDays.endIso),
    });

    const juneTotal = sumSales(juneLines);
    const julyTotal = sumSales(julyLines);
    const augustTotal = sumSales(augustLines);

    expect(juneTotal).toBeGreaterThan(0);
    expect(julyTotal).toBeGreaterThan(0);
    expect(juneTotal).not.toBe(julyTotal);
    expect(augustTotal).not.toBe(julyTotal);
    expect(julyTotal).not.toBe(roundMoney(juneTotal + augustTotal));

    const juneMax = juneLines
      .filter((line) => !line.voided)
      .reduce((max, line) => Math.max(max, line.at.getTime()), 0);
    const julyMin = julyLines
      .filter((line) => !line.voided)
      .reduce(
        (min, line) => Math.min(min, line.at.getTime()),
        Number.POSITIVE_INFINITY
      );
    expect(juneMax).toBeLessThan(julyMin);
  });

  it("July fixture path still loads only July business-day checkout lines", async () => {
    const july = await loadPeriodImports(JULY_2026_PERIOD_KEY);
    const paths = july2026FixturePaths();
    const bounds = getPeriodCatalogEntry(JULY_2026_PERIOD_KEY).businessDays;
    const expected = await parseCheckoutFile(paths.checkout, {
      start: new Date(bounds.startIso),
      end: new Date(bounds.endIso),
    });
    expect(sumSales(july.checkoutLines)).toBe(sumSales(expected));
  });

  it("June load uses overlapping storage with June noon filter, not July totals", async () => {
    const june = await loadPeriodImports("2026-06");
    const july = await loadPeriodImports(JULY_2026_PERIOD_KEY);
    expect(sumSales(june.checkoutLines)).not.toBe(sumSales(july.checkoutLines));
    expect(june.source).not.toBe("fixture");
  });
});
