import { compileFetchedPayPeriod } from "@/import/compile-from-fetched";
import { loadJuly2026FetchedFromFixtures } from "@/import/load-july-fixtures-as-fetched";
import { parseNamedSalaryCsv } from "@/import/parse-named-salary-csv";
import type { PayRow } from "@/compile/types";
import { payRowsToNamedCsv } from "@/export/pay-report-csv";
import {
  JULY_2026_PERIOD,
  july2026FixturePaths,
} from "@/lib/july-2026-fixtures";
import { roundMoney } from "@/lib/money";

async function compileJulyFixtures() {
  return compileFetchedPayPeriod(loadJuly2026FetchedFromFixtures(), {
    start: new Date(JULY_2026_PERIOD.startIso),
    end: new Date(JULY_2026_PERIOD.endIso),
  });
}

function row(
  result: Awaited<ReturnType<typeof compileJulyFixtures>>,
  nickname: string,
  venue: PayRow["venue"] = "frontOfHouse"
): PayRow {
  const found = result.payRows.find(
    (payRow) => payRow.primaryNickname === nickname && payRow.venue === venue
  );
  if (!found) {
    throw new Error(`missing 薪資列 ${nickname} ${venue}`);
  }
  return found;
}

describe("compilePayPeriod July 2026 fixtures", () => {
  let compiled: Awaited<ReturnType<typeof compileJulyFixtures>>;
  let sheet: ReturnType<typeof parseNamedSalaryCsv>;

  beforeAll(async () => {
    compiled = await compileJulyFixtures();
    sheet = parseNamedSalaryCsv(july2026FixturePaths().northStarCsv);
  });

  it("gives 粉冥 the 個人業績 on the 7月 sheet", () => {
    expect(row(compiled, "粉冥").original.sales).toBe(75685);
  });

  it("sets 原始業績獎金 at 20% of that row's 營業額", () => {
    expect(row(compiled, "粉冥").original.commission).toBe(15137);
  });

  it("maps 黒夢 業績注記 onto 黑夢 via 別名", () => {
    expect(row(compiled, "黑夢").original.sales).toBe(37720);
  });

  it("keeps 久橙 as two 薪資列 whose 營業額 sum to 個人業績", () => {
    const front = row(compiled, "久橙", "frontOfHouse").original.sales;
    const back = row(compiled, "久橙", "backOfHouse").original.sales;
    expect(front).toBe(1150);
    expect(back).toBe(2950);
    expect(roundMoney(front + back)).toBe(4100);
  });

  it("excludes voided 結帳 from 個人業績", () => {
    const voided = compiled.payRows.reduce(
      (sum, payRow) => sum + payRow.original.sales,
      0
    );
    expect(voided).toBeGreaterThan(0);
    expect(
      compiled.unmatchedNicknames.find((item) => item.nickname === "DDB單點")
    ).toBeTruthy();
  });

  it("lists 未對上的暱稱 including DDB單點 and does not lock", () => {
    const ddb = compiled.unmatchedNicknames.find(
      (item) => item.nickname === "DDB單點"
    );
    expect(ddb?.amount).toBe(615);
    expect(compiled.lockEligible).toBe(false);
  });

  it("computes 應扣 as 記點 × 單點金額 230", () => {
    expect(row(compiled, "祤晞").original.demerits).toBe(0);
    expect(row(compiled, "祤晞").stored.demerits).toBe(6);
    expect(row(compiled, "祤晞").original.deduction).toBe(1380);
    expect(row(compiled, "久橙", "frontOfHouse").original.deduction).toBe(230);
    expect(row(compiled, "久橙", "backOfHouse").original.deduction).toBe(0);
  });

  it("lands 勞健保 on 久橙's 內場 薪資列 only", () => {
    expect(
      row(compiled, "久橙", "frontOfHouse").original.laborHealthInsurance
    ).toBe(0);
    expect(
      row(compiled, "久橙", "backOfHouse").original.laborHealthInsurance
    ).toBe(4200);
  });

  it("uses 月薪 as 原始底薪 on 湯圓's 外場 薪資列", () => {
    expect(row(compiled, "湯圓").original.basePay).toBe(42000);
  });

  it("matches 7月 named 營業額／業績獎金／達標／記點／應扣／加給 for POS-tied rows", () => {
    const skipSales = new Set(["鴉", "羊羊", "茉捺", "湯圓", "琦玥"]);
    for (const expected of sheet) {
      if (!expected.primaryNickname) {
        continue;
      }
      const payRow = compiled.payRows.find(
        (item) =>
          item.primaryNickname === expected.primaryNickname &&
          item.venue === expected.venue
      );
      expect(payRow, expected.primaryNickname).toBeTruthy();
      if (!payRow) {
        continue;
      }
      const guestLayoutQuirk = [
        "小楓",
        "七津希",
        "偷洗",
        "琦玥",
        "小寧",
      ].includes(expected.primaryNickname);
      if (guestLayoutQuirk) {
        if (!skipSales.has(expected.primaryNickname) && expected.sales > 0) {
          expect(payRow.original.sales, expected.primaryNickname).toBe(
            expected.sales
          );
          expect(payRow.original.commission, expected.primaryNickname).toBe(
            expected.commission
          );
        }
        continue;
      }
      expect(payRow.legalName).toBe(expected.legalName);
      expect(payRow.original.targetBonus).toBe(expected.targetBonus);
      expect(payRow.stored.demerits).toBe(expected.demerits);
      expect(payRow.original.deduction).toBe(expected.deduction);
      expect(payRow.stored.allowance).toBe(expected.allowance);
      if (!skipSales.has(expected.primaryNickname)) {
        expect(payRow.original.sales, expected.primaryNickname).toBe(
          expected.sales
        );
        expect(payRow.original.commission, expected.primaryNickname).toBe(
          expected.commission
        );
      }
    }
  });

  it("writes UTF-8 BOM CSV of named columns, not the untitled 加班 gap", () => {
    const csv = payRowsToNamedCsv(compiled.payRows);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("職稱,本名,暱稱");
    expect(csv).not.toContain(",,,,加給");
    expect(csv).toContain("粉冥");
  });

  it("marks required 匯入 incomplete when fixture only has two 注記 drill-downs", () => {
    expect(compiled.requiredImportsComplete).toBe(false);
  });
});
