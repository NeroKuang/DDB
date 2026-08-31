import { chromium } from "playwright";
import {
  applyDotEnvFile,
  loginIchef,
  openBusinessReports,
  readIchefCredentialsFromEnv,
} from "@/fetch/ichef-web-fetch";

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
});
