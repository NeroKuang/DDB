import {
  assertValidPeriodKey,
  formatPeriodKey,
} from "@/lib/pay-period-calendar";
import { prisma } from "@/lib/prisma";
import { getPayPeriodState, isPayPeriodLocked } from "@/pay-period/state";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";
import { runWebFetchJob, startWebFetchAndQueueJob } from "@/web-fetch/manage";
import { logServerError } from "@/lib/log-server-error";

export type BackfillPeriodResult = {
  periodKey: string;
  status: "succeeded" | "skipped" | "failed";
  reason?: string;
};

export type BackfillPayPeriodsResult = {
  from: string;
  to: string;
  results: BackfillPeriodResult[];
};

/** Inclusive YYYY-MM range → period keys ascending. */
export function enumeratePeriodKeys(from: string, to: string): string[] {
  assertValidPeriodKey(from);
  assertValidPeriodKey(to);
  const fromY = Number(from.slice(0, 4));
  const fromM = Number(from.slice(5, 7));
  const toY = Number(to.slice(0, 4));
  const toM = Number(to.slice(5, 7));
  const start = fromY * 12 + (fromM - 1);
  const end = toY * 12 + (toM - 1);
  if (start > end) {
    throw new Error(`起迄錯誤：${from} 晚於 ${to}`);
  }
  const keys: string[] = [];
  for (let cursor = start; cursor <= end; cursor += 1) {
    const year = Math.floor(cursor / 12);
    const month = (cursor % 12) + 1;
    keys.push(formatPeriodKey(year, month));
  }
  return keys;
}

/** Current calendar month YYYY-MM in Asia/Taipei. */
export function currentCalendarMonthKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  return formatPeriodKey(year, month);
}

/**
 * Sequentially run 網頁取數 for each 薪資期間 in [from, to].
 * One store lock at a time — each month awaits full Playwright + ingest.
 */
export async function backfillPayPeriods(input: {
  fromPeriodKey: string;
  toPeriodKey?: string;
  /** Re-fetch even when period already SUCCEEDED. Default false. */
  force?: boolean;
  /** Continue remaining months after a failure. Default false. */
  continueOnError?: boolean;
}): Promise<BackfillPayPeriodsResult> {
  const from = input.fromPeriodKey;
  const to = input.toPeriodKey ?? currentCalendarMonthKey();
  const periodKeys = enumeratePeriodKeys(from, to);
  const store = await prisma.store.findUnique({
    where: { code: ZHONGSHAN_STORE_CODE },
  });
  if (!store) {
    throw new Error("中山門市尚未初始化");
  }

  const results: BackfillPeriodResult[] = [];

  for (const periodKey of periodKeys) {
    await prisma.payPeriod.upsert({
      where: {
        storeId_periodKey: { storeId: store.id, periodKey },
      },
      create: { storeId: store.id, periodKey },
      update: {},
    });

    const state = await getPayPeriodState(store.id, periodKey);
    if (isPayPeriodLocked(state)) {
      results.push({
        periodKey,
        status: "skipped",
        reason: "period locked",
      });
      continue;
    }

    const row = await prisma.payPeriod.findUnique({
      where: {
        storeId_periodKey: { storeId: store.id, periodKey },
      },
      select: {
        fetchStatus: true,
        activeImportRunId: true,
      },
    });
    if (
      !input.force &&
      row?.fetchStatus === "SUCCEEDED" &&
      row.activeImportRunId
    ) {
      results.push({
        periodKey,
        status: "skipped",
        reason: "already succeeded",
      });
      continue;
    }

    console.info(`[backfill] starting 網頁取數 ${periodKey}`);
    try {
      const { periodId } = await startWebFetchAndQueueJob({
        actorRole: "ADMIN",
        storeId: store.id,
        periodKey,
      });
      await runWebFetchJob(periodId);
      const after = await prisma.payPeriod.findUnique({
        where: { id: periodId },
        select: { fetchStatus: true, fetchErrorMessage: true },
      });
      if (after?.fetchStatus === "SUCCEEDED") {
        results.push({ periodKey, status: "succeeded" });
        console.info(`[backfill] ${periodKey} succeeded`);
      } else {
        const reason = after?.fetchErrorMessage ?? "fetch not succeeded";
        results.push({ periodKey, status: "failed", reason });
        console.error(`[backfill] ${periodKey} failed: ${reason}`);
        if (!input.continueOnError) {
          break;
        }
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logServerError("backfillPayPeriods", error, { periodKey });
      results.push({ periodKey, status: "failed", reason });
      console.error(`[backfill] ${periodKey} failed: ${reason}`);
      if (!input.continueOnError) {
        break;
      }
    }
  }

  return { from, to, results };
}
