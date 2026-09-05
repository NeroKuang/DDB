/**
 * Local diag: open August checkout report and capture PopConfirm / Angular readiness.
 * Writes screenshots + text under storage/logs/ichef-diag/ (no passwords).
 *
 *   npx dotenv -e .env -- npx tsx scripts/diag-ichef-popup.ts
 */
import { chromium, type Page } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import {
  applyDotEnvFile,
  loginIchef,
  readIchefCredentialsFromEnv,
} from "../src/fetch/ichef-web-fetch";

const RANGE = { startDate: "2026-07-31", endDate: "2026-09-01" };
const CHECKOUT_PATH = "/analyse/index/invoice_record_report";
const OUT = path.join(process.cwd(), "storage", "logs", "ichef-diag");

applyDotEnvFile(".env");
applyDotEnvFile(".env.local");

async function capturePageState(page: Page, label: string): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = `${stamp}-${label}`;
  const screenshotPath = path.join(OUT, `${base}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const state = await page.evaluate(() => {
    const overlays = [
      ...document.querySelectorAll(
        '[data-fe-test-id="popConfirm-overlay"], [class*="PopConfirm"], .gyp-base-layer'
      ),
    ];
    const overlayTexts = overlays.map((el) => ({
      testId: el.getAttribute("data-fe-test-id"),
      className: el.className?.toString?.() ?? "",
      text: (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 800),
    }));
    const buttons = [...document.querySelectorAll("button, a, [role='button']")]
      .filter((el) => {
        const style = window.getComputedStyle(el);
        return style.visibility !== "hidden" && style.display !== "none";
      })
      .map((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim())
      .filter((t) => t.length > 0 && t.length < 40)
      .slice(0, 40);

    let angularReady = false;
    let angularError: string | null = null;
    try {
      const w = window as Window & {
        angular?: {
          element: (el: HTMLElement) => {
            scope: () => { $root?: unknown };
          };
        };
      };
      angularReady = Boolean(w.angular?.element(document.body).scope()?.$root);
    } catch (error) {
      angularError = error instanceof Error ? error.message : String(error);
    }

    return {
      url: location.href,
      title: document.title,
      bodySnippet: (document.body?.innerText ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1200),
      overlayTexts,
      buttons,
      angularReady,
      angularError,
    };
  });

  const jsonPath = path.join(OUT, `${base}.json`);
  writeFileSync(jsonPath, JSON.stringify(state, null, 2), "utf8");
  console.log("\n=== capture", label, "===");
  console.log("url:", state.url);
  console.log("title:", state.title);
  console.log("angularReady:", state.angularReady, state.angularError ?? "");
  console.log("overlays:", state.overlayTexts.length);
  for (const [i, o] of state.overlayTexts.entries()) {
    console.log(`  [${i}] testId=${o.testId} text=${JSON.stringify(o.text)}`);
  }
  console.log("visible buttons/links (sample):", state.buttons.join(" | "));
  console.log("body snippet:", state.bodySnippet.slice(0, 400));
  console.log("screenshot:", screenshotPath);
  console.log("json:", jsonPath);
}

async function main(): Promise<void> {
  const creds = readIchefCredentialsFromEnv();
  if (!creds) {
    throw new Error("缺少 STORE_ID／LOGIN_ID／LOGIN_PASSWORD");
  }

  mkdirSync(OUT, { recursive: true });
  console.log("range", RANGE);
  console.log("out", OUT);

  const headed = process.env.HEADED === "1";
  const browser = await chromium.launch({ headless: !headed });
  const page = await browser.newPage();
  try {
    console.log("login…");
    await loginIchef(page, creds);
    await capturePageState(page, "after-login");

    console.log("goto checkout report…");
    await page.goto(`https://login.ichefpos.com${CHECKOUT_PATH}`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2_000);
    await capturePageState(page, "after-goto-checkout");

    // Try Escape / common dismiss like production
    await page.keyboard.press("Escape").catch(() => undefined);
    for (const name of ["我知道了", "取消", "關閉", "確定"]) {
      const btn = page.getByRole("button", { name, exact: true });
      try {
        if (await btn.first().isVisible({ timeout: 800 })) {
          console.log("click dismiss:", name);
          await btn.first().click({ timeout: 3_000 });
          await page.waitForTimeout(500);
        }
      } catch {
        // continue
      }
    }
    await capturePageState(page, "after-dismiss-attempt");

    console.log("wait Angular $root (30s)…");
    try {
      await page.waitForFunction(
        () => {
          const w = window as Window & {
            angular?: {
              element: (el: HTMLElement) => {
                scope: () => { $root?: unknown };
              };
            };
          };
          return Boolean(w.angular?.element(document.body).scope()?.$root);
        },
        { timeout: 30_000 }
      );
      console.log("Angular $root OK");
      await capturePageState(page, "angular-ready");
    } catch (error) {
      console.error(
        "waitForFunction FAILED:",
        error instanceof Error ? error.message : error
      );
      await capturePageState(page, "waitForFunction-timeout");
      process.exitCode = 1;
      return;
    }

    console.log("set date range…", RANGE);
    await page.evaluate(
      ({ startDate: start, endDate: end }) => {
        const w = window as Window & {
          angular?: {
            element: (el: HTMLElement) => {
              scope: () => {
                $root: {
                  start_date: string;
                  end_date: string;
                  $apply: () => void;
                };
              };
            };
          };
        };
        const root = w.angular!.element(document.body).scope().$root;
        root.start_date = start;
        root.end_date = end;
        root.$apply();
      },
      { startDate: RANGE.startDate, endDate: RANGE.endDate }
    );
    await page.waitForTimeout(1_000);
    await capturePageState(page, "after-set-date");

    const tip = page
      .locator('[data-fe-test-id="popConfirm"]')
      .getByText("我知道了", { exact: true });
    if (await tip.isVisible({ timeout: 2_000 }).catch(() => false)) {
      console.log("dismiss tip: 我知道了");
      await tip.click();
      await page.waitForTimeout(500);
    }
    await capturePageState(page, "after-tip-dismiss");

    console.log("wait 下載報表.xlsx then click…");
    await page.getByText("下載報表.xlsx", { exact: true }).first().waitFor({
      timeout: 30_000,
    });
    await capturePageState(page, "before-download-click");
    try {
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 60_000 }),
        page
          .getByText("下載報表.xlsx", { exact: true })
          .first()
          .click({ timeout: 30_000 }),
      ]);
      console.log("download OK:", download.suggestedFilename());
      await capturePageState(page, "after-download-ok");
    } catch (error) {
      console.error(
        "download FAIL:",
        error instanceof Error ? error.message.slice(0, 800) : error
      );
      await capturePageState(page, "download-fail");
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
