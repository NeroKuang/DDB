import type { AccountRole, WebFetchStatus } from "@prisma/client";
import {
  fetchIchefDailyReports,
  readIchefCredentialsFromEnv,
  type FetchedIchefDailyFiles,
  type IchefCredentials,
} from "@/fetch/ichef-web-fetch";
import { runDailyIngestPipeline } from "@/import/ingest/run-daily-ingest-pipeline";
import {
  businessDateOf,
  enumerateBusinessDates,
  ichefFileRangeForBusinessDate,
} from "@/lib/business-day";
import { logServerError } from "@/lib/log-server-error";
import { prisma } from "@/lib/prisma";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";
import {
  acquireStoreFetchLock,
  releaseStoreFetchLock,
} from "@/web-fetch/store-fetch-lock";

export const MAX_RANGE_BUSINESS_DAYS = 31;

export type DailyFetchRunner = (
  creds: IchefCredentials,
  range: { startDate: string; endDate: string }
) => Promise<FetchedIchefDailyFiles>;

let dailyFetchRunner: DailyFetchRunner = fetchIchefDailyReports;

export function setDailyFetchRunnerForTests(
  runner: DailyFetchRunner | null
): void {
  dailyFetchRunner = runner ?? fetchIchefDailyReports;
}

function requireAdmin(actorRole: AccountRole): void {
  if (actorRole !== "ADMIN") {
    throw new Error("Only Admin can start 每日取數");
  }
}

async function ensureBusinessDayRow(storeId: string, businessDate: string) {
  return prisma.businessDayImport.upsert({
    where: {
      storeId_businessDate: { storeId, businessDate },
    },
    create: { storeId, businessDate },
    update: {},
  });
}

export async function runDailyFetchJob(
  storeId: string,
  businessDate: string
): Promise<void> {
  const row = await prisma.businessDayImport.findUnique({
    where: { storeId_businessDate: { storeId, businessDate } },
  });
  if (!row || row.fetchStatus !== "RUNNING") {
    return;
  }

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { code: true, fetchLockToken: true },
  });
  const lockToken = store?.fetchLockToken ?? null;
  const range = ichefFileRangeForBusinessDate(businessDate);

  try {
    const creds = readIchefCredentialsFromEnv();
    if (!creds) {
      await prisma.businessDayImport.update({
        where: { id: row.id },
        data: {
          fetchStatus: "FAILED",
          fetchFinishedAt: new Date(),
          fetchErrorMessage: "iCHEF 憑證未設定",
        },
      });
      return;
    }
    const fetched = await dailyFetchRunner(creds, range);
    await runDailyIngestPipeline({
      storeId,
      storeCode: store?.code || ZHONGSHAN_STORE_CODE,
      businessDate,
      source: "WEB_FETCH",
      files: [fetched.checkout, fetched.punches],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "每日取數失敗";
    await prisma.businessDayImport.update({
      where: { id: row.id },
      data: {
        fetchStatus: "FAILED",
        fetchFinishedAt: new Date(),
        fetchErrorMessage: message.slice(0, 2000),
      },
    });
    logServerError("runDailyFetchJob", error, { storeId, businessDate });
  } finally {
    if (lockToken) {
      await releaseStoreFetchLock(storeId, lockToken);
    }
  }
}

export async function startDailyFetch(input: {
  actorRole: AccountRole;
  storeId: string;
  businessDate: string;
}): Promise<{ status: WebFetchStatus }> {
  requireAdmin(input.actorRole);
  const creds = readIchefCredentialsFromEnv();
  if (!creds) {
    throw new Error("iCHEF 憑證未設定（STORE_ID／LOGIN_ID／LOGIN_PASSWORD）");
  }

  const row = await ensureBusinessDayRow(input.storeId, input.businessDate);
  if (row.fetchStatus === "RUNNING") {
    throw new Error("該營業日取數進行中");
  }

  const lock = await acquireStoreFetchLock(input.storeId);
  if (!lock.ok) {
    throw new Error("已有取數進行中，請待完成後再試");
  }

  const range = ichefFileRangeForBusinessDate(input.businessDate);
  try {
    await prisma.businessDayImport.update({
      where: { id: row.id },
      data: {
        fetchStatus: "RUNNING",
        fetchStartedAt: new Date(),
        fetchFinishedAt: null,
        fetchErrorMessage: null,
        fetchRangeStart: range.startDate,
        fetchRangeEnd: range.endDate,
      },
    });
    return { status: "RUNNING" };
  } catch (error) {
    await releaseStoreFetchLock(input.storeId, lock.token);
    throw error;
  }
}

/** Catch-up: oldest incomplete among the last `lookbackDays` business days. */
export async function runDailyFetchCatchUp(input: {
  storeId: string;
  lookbackDays?: number;
  now?: Date;
}): Promise<{
  attempted: string[];
  skippedReason?: string;
}> {
  const lookback = input.lookbackDays ?? 7;
  const now = input.now ?? new Date();
  const endDate = businessDateOf(now);
  // Previous completed business day ends at today's noon; prefer ending at endDate - 0
  // and include recent days. Catch-up from endDate-(lookback-1) .. endDate.
  const startParts = new Date(`${endDate}T12:00:00+08:00`);
  startParts.setUTCDate(startParts.getUTCDate() - (lookback - 1));
  const startDate = startParts.toLocaleDateString("en-CA", {
    timeZone: "Asia/Taipei",
  });
  const dates = enumerateBusinessDates(startDate, endDate);
  const attempted: string[] = [];

  for (const businessDate of dates) {
    const row = await ensureBusinessDayRow(input.storeId, businessDate);
    if (row.fetchStatus === "SUCCEEDED" && row.activeImportRunId) {
      continue;
    }
    if (row.fetchStatus === "RUNNING") {
      return {
        attempted,
        skippedReason: "day already running",
      };
    }

    const lock = await acquireStoreFetchLock(input.storeId);
    if (!lock.ok) {
      return {
        attempted,
        skippedReason: "store fetch lock busy",
      };
    }

    const range = ichefFileRangeForBusinessDate(businessDate);
    try {
      await prisma.businessDayImport.update({
        where: { id: row.id },
        data: {
          fetchStatus: "RUNNING",
          fetchStartedAt: new Date(),
          fetchFinishedAt: null,
          fetchErrorMessage: null,
          fetchRangeStart: range.startDate,
          fetchRangeEnd: range.endDate,
        },
      });
      attempted.push(businessDate);
      await runDailyFetchJob(input.storeId, businessDate);
    } catch (error) {
      await releaseStoreFetchLock(input.storeId, lock.token);
      logServerError("runDailyFetchCatchUp", error, {
        storeId: input.storeId,
        businessDate,
      });
      return {
        attempted,
        skippedReason: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return { attempted };
}

export async function startRangeBackfill(input: {
  actorRole: AccountRole;
  storeId: string;
  startBusinessDate: string;
  endBusinessDate: string;
  /** When false (default), skip days already SUCCEEDED. */
  force?: boolean;
}): Promise<{ queued: string[] }> {
  requireAdmin(input.actorRole);
  const dates = enumerateBusinessDates(
    input.startBusinessDate,
    input.endBusinessDate
  );
  if (dates.length > MAX_RANGE_BUSINESS_DAYS) {
    throw new Error(`一次最多補取 ${MAX_RANGE_BUSINESS_DAYS} 個營業日`);
  }

  const queued: string[] = [];
  for (const businessDate of dates) {
    const row = await ensureBusinessDayRow(input.storeId, businessDate);
    if (
      !input.force &&
      row.fetchStatus === "SUCCEEDED" &&
      row.activeImportRunId
    ) {
      continue;
    }
    queued.push(businessDate);
  }
  return { queued };
}

/** Run queued days sequentially (caller holds after() / cron). */
export async function runRangeBackfillJobs(
  storeId: string,
  businessDates: string[]
): Promise<void> {
  for (const businessDate of businessDates) {
    try {
      await startDailyFetch({
        actorRole: "ADMIN",
        storeId,
        businessDate,
      });
      await runDailyFetchJob(storeId, businessDate);
    } catch (error) {
      logServerError("runRangeBackfillJobs", error, {
        storeId,
        businessDate,
      });
      // Continue remaining days when lock/busy; stop on unexpected?
      const message = error instanceof Error ? error.message : "";
      if (message.includes("進行中")) {
        break;
      }
    }
  }
}
