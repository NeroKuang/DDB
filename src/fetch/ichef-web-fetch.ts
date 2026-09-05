import { chromium } from "playwright";
import type { Download, Page } from "playwright";
import { readFileSync } from "fs";
import path from "path";

export type IchefCredentials = {
  storeId: string;
  loginId: string;
  password: string;
};

import type { NoteOuterItem } from "@/import/parse-note-analysis";
import {
  mergeNoteOuterItems,
  noteOuterMatchesDrilldowns,
  noteOuterNamesMissingDrilldowns,
  normalizeNoteItemName,
  parseNoteOuterProductSheetFromBuffer,
} from "@/import/parse-note-analysis";

export type DownloadedXlsx = {
  filename: string;
  bytes: Buffer;
};

export type FetchedIchefFiles = {
  checkout: DownloadedXlsx;
  punches: DownloadedXlsx;
  noteOuter: DownloadedXlsx;
  /** Parsed from downloaded modifier-analysis xlsx (authoritative item list). */
  noteOuterItems?: NoteOuterItem[];
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

/**
 * iCHEF PopConfirm / tip overlays intercept pointer events and block downloads.
 * Known tip after setting checkout date range:
 * 「點擊列表最右側「＞」符號，可以查看桌號與更多訂單細節。」+「我知道了」
 */
async function dismissBlockingOverlays(page: Page): Promise<void> {
  await dismissAnnouncement(page);

  // Prefer visible tip / confirm CTA (may not be role=button in Angular markup).
  const tipConfirm = page
    .locator('[data-fe-test-id="popConfirm"]')
    .getByText("我知道了", { exact: true });
  try {
    if (await tipConfirm.isVisible({ timeout: 800 })) {
      await tipConfirm.click({ timeout: 3_000 });
      await page.waitForTimeout(300);
    }
  } catch {
    // fall through
  }

  for (const name of ["我知道了", "知道了", "取消", "關閉", "確定"]) {
    const byRole = page.getByRole("button", { name, exact: true });
    const byText = page.getByText(name, { exact: true });
    for (const locator of [byRole, byText]) {
      try {
        const target = locator.last();
        if (await target.isVisible({ timeout: 400 })) {
          await target.click({ timeout: 3_000 });
          await page.waitForTimeout(300);
        }
      } catch {
        // try next
      }
    }
  }

  const overlay = page.locator('[data-fe-test-id="popConfirm-overlay"]');
  if ((await overlay.count()) === 0) {
    return;
  }

  await page.keyboard.press("Escape").catch(() => undefined);
  try {
    await overlay.first().waitFor({ state: "hidden", timeout: 2_000 });
  } catch {
    // still present — caller may force-click; we logged what we could
  }
}

/** Zeabur Chromium + iCHEF SPA cold start often exceeds 30s. */
const ANGULAR_READY_MS = 90_000;

type AngularWindow = Window & {
  angular?: {
    element: (el: HTMLElement) => {
      scope: () => {
        $root?: {
          start_date?: string;
          end_date?: string;
          $apply?: () => void;
        };
      };
      injector: () => { get: (name: string) => unknown };
    };
  };
};

async function captureIchefPageDiag(page: Page): Promise<string> {
  try {
    const state = await page.evaluate(() => {
      const overlays = [
        ...document.querySelectorAll(
          '[data-fe-test-id="popConfirm-overlay"], [data-fe-test-id="popConfirm"]'
        ),
      ].map((el) =>
        (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 200)
      );
      const w = window as AngularWindow;
      let hasAngular = Boolean(w.angular);
      let hasRoot = false;
      try {
        hasRoot = Boolean(w.angular?.element(document.body).scope()?.$root);
      } catch {
        hasRoot = false;
      }
      return {
        url: location.href,
        hasAngular,
        hasRoot,
        overlays: overlays.filter(Boolean).slice(0, 3),
        body: (document.body?.innerText ?? "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 280),
      };
    });
    return JSON.stringify(state);
  } catch (error) {
    return `diag-failed:${error instanceof Error ? error.message : String(error)}`;
  }
}

/** Probe used in-page: $root may not sit on document.body alone. */
async function waitForAngularRoot(page: Page, label: string): Promise<void> {
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
        if (!w.angular?.element) {
          return false;
        }
        const candidates = [
          document.body,
          document.querySelector("[ng-app]"),
          document.querySelector(".ng-scope"),
          document.querySelector("[ng-controller]"),
        ].filter((el): el is HTMLElement => el instanceof HTMLElement);
        for (const el of candidates) {
          try {
            if (w.angular.element(el).scope()?.$root) {
              return true;
            }
          } catch {
            // try next candidate
          }
        }
        return false;
      },
      { timeout: ANGULAR_READY_MS }
    );
  } catch (error) {
    const diag = await captureIchefPageDiag(page);
    const tip = error instanceof Error ? error.message : String(error);
    throw new IchefFetchError(
      `Angular $root not ready (${label}) within ${ANGULAR_READY_MS}ms (${tip}); ${diag}`
    );
  }
}

async function setAngularDateRange(
  page: Page,
  startDate: string,
  endDate: string,
  label = "setAngularDateRange"
): Promise<void> {
  try {
    await waitForAngularRoot(page, label);
  } catch (firstError) {
    // One reload helps when SPA boot races after goto (seen on Zeabur).
    await page.reload({ waitUntil: "domcontentloaded" }).catch(() => undefined);
    await page
      .waitForLoadState("networkidle", { timeout: 15_000 })
      .catch(() => undefined);
    await dismissBlockingOverlays(page);
    try {
      await waitForAngularRoot(page, `${label}/reload`);
    } catch {
      throw firstError instanceof Error
        ? firstError
        : new IchefFetchError(String(firstError));
    }
  }
  await page.evaluate(
    ({ startDate: start, endDate: end }) => {
      const w = window as AngularWindow;
      if (!w.angular?.element) {
        throw new Error("iCHEF angular missing");
      }
      const candidates = [
        document.body,
        document.querySelector("[ng-app]"),
        document.querySelector(".ng-scope"),
        document.querySelector("[ng-controller]"),
      ].filter((el): el is HTMLElement => el instanceof HTMLElement);
      let root:
        | {
            start_date: string;
            end_date: string;
            $apply: () => void;
          }
        | undefined;
      for (const el of candidates) {
        try {
          const candidate = w.angular.element(el).scope()?.$root;
          if (candidate?.$apply) {
            root = candidate as {
              start_date: string;
              end_date: string;
              $apply: () => void;
            };
            break;
          }
        } catch {
          // try next
        }
      }
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

const NOTE_OUTER_DOWNLOAD_LABEL = "下載註記分析.XLS";

/** iCHEF saves POS 加料注記 outer export with this filename prefix. */
export function isModifierAnalysisOuterFilename(filename: string): boolean {
  return /^modifier-analysis/i.test(path.basename(filename));
}

async function waitForNoteReportReady(
  page: Page,
  startDate: string
): Promise<void> {
  await page
    .getByText(NOTE_OUTER_DOWNLOAD_LABEL)
    .first()
    .waitFor({ timeout: 30_000 });
  await waitForNoteOuterTable(page);
  await page.getByText(startDate).first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(2_000);
}

async function downloadModifierAnalysisOuter(
  page: Page
): Promise<DownloadedXlsx> {
  const file = await clickDownload(page, NOTE_OUTER_DOWNLOAD_LABEL);
  if (!isModifierAnalysisOuterFilename(file.filename)) {
    throw new IchefFetchError(
      `注記外層下載檔名應為 modifier-analysis（收到 ${file.filename}）；請確認已在注記分析頁且日期區間已套用`
    );
  }
  if (!file.bytes.length) {
    throw new IchefFetchError("modifier-analysis 外層 xlsx 為空");
  }
  return file;
}

async function parseOuterItemsFromDownload(
  noteOuter: DownloadedXlsx
): Promise<NoteOuterItem[]> {
  return mergeNoteOuterItems(
    await parseNoteOuterProductSheetFromBuffer(
      noteOuter.bytes,
      noteOuter.filename,
      []
    )
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
  await dismissBlockingOverlays(page);
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60_000 }),
    page.getByText(name).first().click({ timeout: 30_000 }),
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
  console.info(
    JSON.stringify({
      level: "info",
      context: "fetchIchef",
      step: "openReport",
      path,
      at: new Date().toISOString(),
    })
  );
  await page.goto(`https://login.ichefpos.com${path}`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .waitForLoadState("networkidle", { timeout: 20_000 })
    .catch(() => undefined);
  assertOnBusinessReports(page);
  await dismissBlockingOverlays(page);
  await setAngularDateRange(page, startDate, endDate, `openReport:${path}`);
  // Tip PopConfirm often appears only after the date range is applied.
  await page.waitForTimeout(800);
  await dismissBlockingOverlays(page);
  await page.getByText(startDate).first().waitFor({ timeout: 30_000 });
  await dismissBlockingOverlays(page);
}

type NoteTagRow = {
  tagUuid: string;
  tagName: string;
  attributeType: string;
};

async function waitForNoteOuterTable(page: Page): Promise<void> {
  await page
    .locator("table.table-hover")
    .getByText("名稱", { exact: true })
    .waitFor({ timeout: 30_000 });
  await page.locator("table.table-hover tr.ng-scope").first().waitFor({
    timeout: 30_000,
  });
}

/** Scroll the outer table so lazy-loaded rows appear before we read the tag list. */
async function scrollNoteOuterTable(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const table = [...document.querySelectorAll("table")].find((el) =>
      el.textContent?.includes("累計加減價額")
    );
    if (!table) {
      return;
    }
    let previousCount = 0;
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const rows = [...table.querySelectorAll("tr.ng-scope")];
      for (const row of rows) {
        row.scrollIntoView({ block: "nearest", behavior: "instant" });
      }
      table.scrollIntoView({ block: "end", behavior: "instant" });
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((resolve) => setTimeout(resolve, 200));
      const count = table.querySelectorAll("tr.ng-scope").length;
      if (count > 0 && count === previousCount) {
        break;
      }
      previousCount = count;
    }
  });
}

function dedupeNoteTagRows(tags: NoteTagRow[]): NoteTagRow[] {
  const byUuid = new Map<string, NoteTagRow>();
  for (const tag of tags) {
    if (!byUuid.has(tag.tagUuid)) {
      byUuid.set(tag.tagUuid, tag);
    }
  }
  return [...byUuid.values()].sort((a, b) =>
    a.tagName.localeCompare(b.tagName, "zh-Hant")
  );
}

async function readTagsFromAngularDataModel(page: Page): Promise<NoteTagRow[]> {
  return page.evaluate(() => {
    const w = window as Window & {
      angular?: {
        element: (el: HTMLElement) => { scope: () => unknown };
      };
    };
    const ang = w.angular?.element(document.body);
    if (!ang) {
      return [];
    }
    const seenUuid = new Set<string>();
    const seenObj = new WeakSet<object>();
    const found: NoteTagRow[] = [];

    function tryPush(item: unknown): void {
      if (!item || typeof item !== "object") {
        return;
      }
      const tag = item as {
        tag_uuid?: string;
        tag_name?: string;
        attribute_type?: string;
      };
      if (!tag.tag_uuid || !tag.tag_name || seenUuid.has(tag.tag_uuid)) {
        return;
      }
      seenUuid.add(tag.tag_uuid);
      found.push({
        tagUuid: tag.tag_uuid,
        tagName: tag.tag_name,
        attributeType: tag.attribute_type ?? "",
      });
    }

    function walk(obj: unknown, depth: number): void {
      if (!obj || depth > 14 || typeof obj !== "object") {
        return;
      }
      if (seenObj.has(obj)) {
        return;
      }
      seenObj.add(obj);
      if (Array.isArray(obj)) {
        for (const item of obj) {
          tryPush(item);
          walk(item, depth + 1);
        }
        return;
      }
      for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith("$") || key.startsWith("_")) {
          continue;
        }
        tryPush(value);
        walk(value, depth + 1);
      }
    }

    try {
      walk(ang.scope(), 0);
      walk((ang.scope() as { $root?: unknown }).$root, 0);
    } catch {
      // ignore scope walk failures
    }
    return found;
  });
}

async function readNoteTagRowsFromDom(page: Page): Promise<NoteTagRow[]> {
  const tags = await page.evaluate(() => {
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
  return dedupeNoteTagRows(tags);
}

async function readNoteTagRows(page: Page): Promise<NoteTagRow[]> {
  await waitForNoteOuterTable(page);
  await scrollNoteOuterTable(page);
  const [domTags, angularTags] = await Promise.all([
    readNoteTagRowsFromDom(page),
    readTagsFromAngularDataModel(page),
  ]);
  return dedupeNoteTagRows([...domTags, ...angularTags]);
}

async function resolveTagFromRowScope(
  page: Page,
  itemName: string
): Promise<NoteTagRow | null> {
  await waitForNoteOuterTable(page);
  await scrollNoteOuterTable(page);
  const row = page
    .locator("table.table-hover tr.ng-scope")
    .filter({ hasText: itemName })
    .first();
  if ((await row.count()) === 0) {
    return null;
  }
  return row.evaluate((el) => {
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
    const tag = w.angular?.element(el as HTMLElement).scope().tag;
    if (!tag?.tag_uuid || !tag.tag_name) {
      return null;
    }
    return {
      tagUuid: tag.tag_uuid,
      tagName: tag.tag_name,
      attributeType: tag.attribute_type,
    };
  });
}

type NoteDrilldownJob = {
  outerName: string;
  tag: NoteTagRow;
};

function buildTagLookup(tags: NoteTagRow[]): Map<string, NoteTagRow> {
  const map = new Map<string, NoteTagRow>();
  for (const tag of tags) {
    map.set(tag.tagName, tag);
    map.set(normalizeNoteItemName(tag.tagName), tag);
  }
  return map;
}

function findTagForOuterName(
  lookup: Map<string, NoteTagRow>,
  outerName: string
): NoteTagRow | undefined {
  return lookup.get(outerName) ?? lookup.get(normalizeNoteItemName(outerName));
}

async function resolveDrilldownJobsForProductOuter(
  page: Page,
  productOuter: NoteOuterItem[],
  initialTags: NoteTagRow[]
): Promise<NoteDrilldownJob[]> {
  const lookup = buildTagLookup(initialTags);
  for (const tag of await readTagsFromAngularDataModel(page)) {
    if (!lookup.has(tag.tagName)) {
      lookup.set(tag.tagName, tag);
      lookup.set(normalizeNoteItemName(tag.tagName), tag);
    }
  }
  const jobs: NoteDrilldownJob[] = [];
  for (const item of productOuter) {
    let tag = findTagForOuterName(lookup, item.name);
    if (!tag) {
      tag = (await resolveTagFromRowScope(page, item.name)) ?? undefined;
      if (tag) {
        lookup.set(tag.tagName, tag);
        lookup.set(normalizeNoteItemName(tag.tagName), tag);
      }
    }
    if (tag) {
      jobs.push({ outerName: item.name, tag });
    }
  }
  return jobs;
}

async function openNoteDrilldown(page: Page, tag: NoteTagRow): Promise<void> {
  try {
    await page.waitForFunction(
      () => {
        const w = window as AngularWindow;
        const candidates = [
          document.body,
          document.querySelector("[ng-app]"),
          document.querySelector(".ng-scope"),
        ].filter((el): el is HTMLElement => el instanceof HTMLElement);
        for (const el of candidates) {
          try {
            if (w.angular?.element(el).injector().get("$state")) {
              return true;
            }
          } catch {
            // try next
          }
        }
        return false;
      },
      { timeout: ANGULAR_READY_MS }
    );
  } catch (error) {
    const diag = await captureIchefPageDiag(page);
    const tip = error instanceof Error ? error.message : String(error);
    throw new IchefFetchError(
      `Angular $state not ready (drilldown:${tag.tagName}) within ${ANGULAR_READY_MS}ms (${tip}); ${diag}`
    );
  }
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
  endDate: string,
  jobs: NoteDrilldownJob[]
): Promise<{ itemName: string; file: DownloadedXlsx }[]> {
  if (jobs.length === 0) {
    throw new IchefFetchError("注記分析 outer list is empty");
  }
  const drilldowns: { itemName: string; file: DownloadedXlsx }[] = [];
  for (const job of jobs) {
    await openNoteDrilldown(page, job.tag);
    await setAngularDateRange(
      page,
      startDate,
      endDate,
      `drilldown:${job.outerName}`
    );
    await page.getByText(startDate).first().waitFor({ timeout: 30_000 });
    await page
      .locator("table")
      .filter({ hasText: "點選數" })
      .locator("tr.ng-scope")
      .first()
      .waitFor({ timeout: 20_000 })
      .catch(() => undefined);
    const downloadName =
      job.tag.attributeType === "comment"
        ? "下載註記比例.XLS"
        : /下載.+分析\.xls/i;
    await page.getByText(downloadName).first().waitFor({ timeout: 30_000 });
    const file = await clickDownload(page, downloadName);
    drilldowns.push({ itemName: job.outerName, file });
  }
  if (drilldowns.length !== jobs.length) {
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
    await waitForNoteReportReady(page, range.startDate);
    const noteOuter = await downloadModifierAnalysisOuter(page);
    const productOuter = await parseOuterItemsFromDownload(noteOuter);
    if (productOuter.length === 0) {
      throw new IchefFetchError("modifier-analysis 外層 xlsx 無品項列");
    }
    await openReport(page, NOTE_PATH, range.startDate, range.endDate);
    await waitForNoteReportReady(page, range.startDate);
    const noteTags = await readNoteTagRows(page);
    const drilldownJobs = await resolveDrilldownJobsForProductOuter(
      page,
      productOuter,
      noteTags
    );
    const unresolvedOuter = productOuter.filter(
      (item) => !drilldownJobs.some((job) => job.outerName === item.name)
    );
    if (unresolvedOuter.length > 0) {
      const preview = unresolvedOuter
        .map((item) => item.name)
        .slice(0, 8)
        .join("、");
      throw new IchefFetchError(
        `外層 xlsx ${productOuter.length} 品項中有 ${unresolvedOuter.length} 個無法點進明細：${preview}${unresolvedOuter.length > 8 ? "…" : ""}`
      );
    }
    const noteDrilldowns = await fetchAllNoteDrilldowns(
      page,
      range.startDate,
      range.endDate,
      drilldownJobs
    );

    const drilldownNames = noteDrilldowns.map((item) => item.itemName);

    if (
      !checkout.bytes.length ||
      !punches.bytes.length ||
      !noteOuter.bytes.length ||
      drilldownJobs.length === 0 ||
      noteDrilldowns.some((item) => !item.file.bytes.length) ||
      !noteOuterMatchesDrilldowns(productOuter, drilldownNames)
    ) {
      const missing = noteOuterNamesMissingDrilldowns(
        productOuter,
        drilldownNames
      );
      const preview = missing.slice(0, 8).join("、");
      throw new IchefFetchError(
        `注記分析未全到齊（外層 xlsx ${productOuter.length} 品項，明細 ${new Set(drilldownNames).size} 品項${missing.length > 0 ? `；缺少明細：${preview}${missing.length > 8 ? "…" : ""}` : ""}）`
      );
    }

    const fetched = {
      checkout,
      punches,
      noteOuter,
      noteOuterItems: productOuter,
      noteDrilldowns,
    };
    return fetched;
  } finally {
    await browser.close();
  }
}
