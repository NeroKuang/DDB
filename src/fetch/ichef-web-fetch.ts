import { chromium } from "playwright";
import type { Download, Page } from "playwright";
import { readFileSync } from "fs";

export type IchefCredentials = {
  storeId: string;
  loginId: string;
  password: string;
};

export type DownloadedXlsx = {
  filename: string;
  bytes: Buffer;
};

export type FetchedIchefFiles = {
  checkout: DownloadedXlsx;
  punches: DownloadedXlsx;
  noteOuter: DownloadedXlsx;
  noteDrilldowns: { itemName: string; file: DownloadedXlsx }[];
};

const LOGIN_URL = "https://login.ichefpos.com/";
const CHECKOUT_PATH = "/analyse/index/invoice_record_report";
const PUNCH_PATH = "/analyse/index/clockin_log_report";
const NOTE_PATH = "/analyse/index/tag_report";

export function applyDotEnvFile(filePath = ".env"): void {
  let text: string;
  try {
    text = readFileSync(filePath, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq < 1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function readIchefCredentialsFromEnv(
  env: NodeJS.Dict<string> = process.env
): IchefCredentials | null {
  const storeId = env.STORE_ID?.trim();
  const loginId = env.LOGIN_ID?.trim();
  const password = env.LOGIN_PASSWORD?.trim();
  if (!storeId || !loginId || !password) {
    return null;
  }
  return { storeId, loginId, password };
}

export class IchefFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IchefFetchError";
  }
}

function assertOnBusinessReports(page: Page): void {
  const path = new URL(page.url()).pathname;
  if (!path.startsWith("/analyse/")) {
    throw new IchefFetchError("網頁取數 left 營業報表 pages");
  }
}

async function dismissAnnouncement(page: Page): Promise<void> {
  const dismiss = page.getByRole("button", { name: "我知道了" });
  try {
    await dismiss.click({ timeout: 4_000 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/Timeout|waiting for/i.test(message)) {
      return;
    }
    throw error;
  }
}

async function setAngularDateRange(
  page: Page,
  startDate: string,
  endDate: string
): Promise<void> {
  await page.waitForFunction(
    () => {
      const w = window as Window & {
        angular?: {
          element: (el: HTMLElement) => {
            scope: () => { $root?: { start_date?: string } };
          };
        };
      };
      return Boolean(w.angular?.element(document.body).scope()?.$root);
    },
    { timeout: 30_000 }
  );
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
      const root = w.angular?.element(document.body).scope().$root;
      if (!root) {
        throw new Error("iCHEF angular root missing");
      }
      root.start_date = start;
      root.end_date = end;
      root.$apply();
    },
    { startDate, endDate }
  );
}

async function saveDownload(download: Download): Promise<DownloadedXlsx> {
  const filename = download.suggestedFilename();
  const path = await download.path();
  if (!path) {
    throw new IchefFetchError(`download ${filename} has no path`);
  }
  return { filename, bytes: readFileSync(path) };
}

async function clickDownload(
  page: Page,
  name: string | RegExp
): Promise<DownloadedXlsx> {
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60_000 }),
    page.getByText(name).first().click(),
  ]);
  return saveDownload(download);
}

export async function loginIchef(
  page: Page,
  creds: IchefCredentials
): Promise<void> {
  await page.goto(LOGIN_URL, {
    waitUntil: "networkidle",
  });
  await page.getByPlaceholder("Store ID").fill(creds.storeId);
  await page.getByPlaceholder("Login ID").fill(creds.loginId);
  await page.getByPlaceholder("Login Password").fill(creds.password);
  await page.getByRole("button", { name: "登入" }).click();
  const reportsNav = page.getByText("營業報表", { exact: true });
  try {
    await reportsNav.first().waitFor({ timeout: 25_000 });
  } catch {
    throw new IchefFetchError("iCHEF login did not reach 營業報表");
  }
  await dismissAnnouncement(page);
}

export async function openBusinessReports(page: Page): Promise<void> {
  await page.getByText("營業報表", { exact: true }).first().click();
}

async function openReport(
  page: Page,
  path: string,
  startDate: string,
  endDate: string
): Promise<void> {
  await page.goto(`https://login.ichefpos.com${path}`, {
    waitUntil: "domcontentloaded",
  });
  assertOnBusinessReports(page);
  await dismissAnnouncement(page);
  await setAngularDateRange(page, startDate, endDate);
  await page.getByText(startDate).first().waitFor({ timeout: 30_000 });
}

type NoteTagRow = {
  tagUuid: string;
  tagName: string;
  attributeType: string;
};

async function readNoteTagRows(page: Page): Promise<NoteTagRow[]> {
  await page
    .locator("table.table-hover")
    .getByText("名稱", { exact: true })
    .waitFor({
      timeout: 30_000,
    });
  await page.locator("table.table-hover tr.ng-scope").first().waitFor({
    timeout: 30_000,
  });
  return page.evaluate(() => {
    const w = window as Window & {
      angular?: {
        element: (el: HTMLElement) => {
          scope: () => {
            tag?: {
              tag_uuid: string;
              tag_name: string;
              attribute_type: string;
            };
          };
        };
      };
    };
    const table = [...document.querySelectorAll("table")].find((el) =>
      el.textContent?.includes("累計加減價額")
    );
    if (!table) {
      return [];
    }
    return [...table.querySelectorAll("tr.ng-scope")].flatMap((row) => {
      const tag = w.angular?.element(row as HTMLElement).scope().tag;
      if (!tag?.tag_uuid || !tag.tag_name) {
        return [];
      }
      return [
        {
          tagUuid: tag.tag_uuid,
          tagName: tag.tag_name,
          attributeType: tag.attribute_type,
        },
      ];
    });
  });
}

async function openNoteDrilldown(page: Page, tag: NoteTagRow): Promise<void> {
  await page.waitForFunction(
    () => {
      const w = window as Window & {
        angular?: {
          element: (el: HTMLElement) => {
            injector: () => { get: (name: string) => unknown };
          };
        };
      };
      try {
        return Boolean(
          w.angular?.element(document.body).injector().get("$state")
        );
      } catch {
        return false;
      }
    },
    { timeout: 30_000 }
  );
  await page.evaluate(
    ({ uuid, name, isComment }) => {
      const w = window as unknown as {
        angular: {
          element: (el: HTMLElement) => {
            injector: () => {
              get: (name: string) => {
                go: (state: string, params: Record<string, string>) => void;
              };
            };
          };
        };
      };
      const $state = w.angular.element(document.body).injector().get("$state");
      if (isComment) {
        $state.go("tag_comment_report", { tag_uuid: uuid });
      } else {
        $state.go("tag_detail_report", {
          tag_uuid: uuid,
          tag_name: name,
        });
      }
    },
    {
      uuid: tag.tagUuid,
      name: tag.tagName,
      isComment: tag.attributeType === "comment",
    }
  );
  await page.waitForURL((url) => url.pathname.includes(tag.tagUuid), {
    timeout: 30_000,
  });
  assertOnBusinessReports(page);
}

async function fetchAllNoteDrilldowns(
  page: Page,
  startDate: string,
  endDate: string
): Promise<{ itemName: string; file: DownloadedXlsx }[]> {
  const tags = await readNoteTagRows(page);
  if (tags.length === 0) {
    throw new IchefFetchError("注記分析 outer list is empty");
  }
  const drilldowns: { itemName: string; file: DownloadedXlsx }[] = [];
  for (const tag of tags) {
    await openNoteDrilldown(page, tag);
    await setAngularDateRange(page, startDate, endDate);
    await page.getByText(startDate).first().waitFor({ timeout: 30_000 });
    // Drill-down data loads after the date apply; wait for body rows when present.
    await page
      .locator("table")
      .filter({ hasText: "點選數" })
      .locator("tr.ng-scope")
      .first()
      .waitFor({ timeout: 20_000 })
      .catch(() => undefined);
    const downloadName =
      tag.attributeType === "comment" ? "下載註記比例.XLS" : /下載.+分析\.xls/i;
    await page.getByText(downloadName).first().waitFor({ timeout: 30_000 });
    const file = await clickDownload(page, downloadName);
    drilldowns.push({ itemName: tag.tagName, file });
  }
  if (drilldowns.length !== tags.length) {
    throw new IchefFetchError(
      "注記分析 drill-down count does not match outer list"
    );
  }
  return drilldowns;
}

export async function fetchIchefBusinessReports(
  creds: IchefCredentials,
  range: { startDate: string; endDate: string }
): Promise<FetchedIchefFiles> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await loginIchef(page, creds);
    await openReport(page, CHECKOUT_PATH, range.startDate, range.endDate);
    await page.getByText("下載報表.xlsx", { exact: true }).first().waitFor({
      timeout: 30_000,
    });
    const checkout = await clickDownload(page, "下載報表.xlsx");

    await openReport(page, PUNCH_PATH, range.startDate, range.endDate);
    await page.getByText("下載打卡記錄").first().waitFor({ timeout: 30_000 });
    const punches = await clickDownload(page, "下載打卡記錄");

    await openReport(page, NOTE_PATH, range.startDate, range.endDate);
    await page
      .getByText("下載註記分析.XLS")
      .first()
      .waitFor({ timeout: 30_000 });
    const noteOuter = await clickDownload(page, "下載註記分析.XLS");
    const noteDrilldowns = await fetchAllNoteDrilldowns(
      page,
      range.startDate,
      range.endDate
    );

    if (
      !checkout.bytes.length ||
      !punches.bytes.length ||
      !noteOuter.bytes.length ||
      noteDrilldowns.some((item) => !item.file.bytes.length)
    ) {
      throw new IchefFetchError("網頁取數 returned an empty xlsx");
    }

    const fetched = { checkout, punches, noteOuter, noteDrilldowns };
    return fetched;
  } finally {
    await browser.close();
  }
}
