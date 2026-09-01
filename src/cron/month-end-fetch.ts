import { prisma } from "@/lib/prisma";
import { startWebFetchAndQueueJob } from "@/web-fetch/manage";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";
import { isPayPeriodLocked, getPayPeriodState } from "@/pay-period/manage";

/** Previous calendar month as YYYY-MM in Asia/Taipei. */
export function previousCalendarMonthKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value ?? "2026");
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "1");
  const date = new Date(Date.UTC(year, month - 2, 1));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export type MonthEndCronResult = {
  periodKey: string;
  started: boolean;
  skippedReason?: string;
  periodId?: string;
};

/** 月結取數：建立上期 PayPeriod、若未鎖定則啟動網頁取數。 */
export async function runMonthEndFetchCron(): Promise<MonthEndCronResult> {
  const periodKey = previousCalendarMonthKey();
  const store = await prisma.store.findUnique({
    where: { code: ZHONGSHAN_STORE_CODE },
  });
  if (!store) {
    return { periodKey, started: false, skippedReason: "store missing" };
  }
  await prisma.payPeriod.upsert({
    where: {
      storeId_periodKey: { storeId: store.id, periodKey },
    },
    create: { storeId: store.id, periodKey },
    update: {},
  });
  const state = await getPayPeriodState(store.id, periodKey);
  if (isPayPeriodLocked(state)) {
    return { periodKey, started: false, skippedReason: "period locked" };
  }
  try {
    const { periodId } = await startWebFetchAndQueueJob({
      actorRole: "ADMIN",
      storeId: store.id,
      periodKey,
    });
    return { periodKey, started: true, periodId };
  } catch (error) {
    return {
      periodKey,
      started: false,
      skippedReason: error instanceof Error ? error.message : String(error),
    };
  }
}
