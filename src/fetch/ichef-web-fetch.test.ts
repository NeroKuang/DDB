import { chromium } from "playwright";
import { compileFetchedPayPeriod } from "@/import/compile-from-fetched";
import { parseNamedSalaryCsv } from "@/import/parse-named-salary-csv";
import {
  applyDotEnvFile,
  fetchIchefBusinessReports,
  loginIchef,
  openBusinessReports,
  readIchefCredentialsFromEnv,
} from "@/fetch/ichef-web-fetch";
import {
  JULY_2026_FILE_RANGE,
  JULY_2026_PERIOD,
  july2026FixturePaths,
} from "@/lib/july-2026-fixtures";

applyDotEnvFile();

describe("live iCHEF 網頁取數", () => {
  const creds = readIchefCredentialsFromEnv();

  it("fails clearly when 憑證 env is missing", () => {
    expect(
      readIchefCredentialsFromEnv({
        STORE_ID: "",
        LOGIN_ID: "",
        LOGIN_PASSWORD: "",
      })
    ).toBeNull();
  });

  it.skipIf(!creds)(
    "logs into iCHEF, opens 營業報表 nav, and never echoes the password",
    async () => {
      if (!creds) {
        return;
      }
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      try {
        await loginIchef(page, creds);
        await openBusinessReports(page);
        expect(
          await page.getByText("營業報表", { exact: true }).first().isVisible()
        ).toBe(true);
        expect(page.url()).toMatch(/ichefpos\.com/);
        const body = await page.locator("body").innerText();
        expect(body).not.toContain(creds.password);
      } finally {
        await browser.close();
      }
    },
    60_000
  );

  it.skipIf(!creds)(
    "fetches July 結帳／打卡／every 注記 drill-down and matches 7月 named columns",
    async () => {
      if (!creds) {
        return;
      }
      const fetched = await fetchIchefBusinessReports(
        creds,
        JULY_2026_FILE_RANGE
      );
      expect(fetched.checkout.filename).toMatch(/結帳/);
      expect(fetched.punches.filename).toMatch(/打卡/);
      expect(fetched.noteOuter.bytes.length).toBeGreaterThan(0);
      expect(fetched.noteDrilldowns.length).toBeGreaterThan(10);
      expect(
        fetched.noteDrilldowns.every((item) => item.file.bytes.length > 0)
      ).toBe(true);
      const compiled = await compileFetchedPayPeriod(fetched, {
        start: new Date(JULY_2026_PERIOD.startIso),
        end: new Date(JULY_2026_PERIOD.endIso),
      });
      expect(compiled.requiredImportsComplete).toBe(true);
      const fenMing = compiled.payRows.find(
        (row) => row.primaryNickname === "粉冥"
      );
      expect(fenMing?.original.sales).toBe(75685);
      expect(fenMing?.original.commission).toBe(15137);

      const sheet = parseNamedSalaryCsv(july2026FixturePaths().northStarCsv);
      const skipSales = new Set(["鴉", "羊羊", "茉捺", "湯圓", "琦玥"]);
      const guestLayoutQuirk = new Set([
        "小楓",
        "七津希",
        "偷洗",
        "琦玥",
        "小寧",
      ]);
      for (const expected of sheet) {
        if (
          !expected.primaryNickname ||
          guestLayoutQuirk.has(expected.primaryNickname)
        ) {
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
      expect(JSON.stringify(compiled)).not.toContain(creds.password);
      expect(fetched.checkout.bytes.length).toBeGreaterThan(0);
      expect(fetched.punches.bytes.length).toBeGreaterThan(0);
    },
    1_200_000
  );
});
