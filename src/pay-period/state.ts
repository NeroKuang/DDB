import { prisma } from "@/lib/prisma";
import { JULY_2026_PERIOD_KEY } from "@/lib/period-keys";
import {
  parsePeriodSnapshot,
  type PeriodSnapshot,
} from "@/pay-period/snapshot";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

export type PayPeriodState = {
  id: string;
  storeId: string;
  periodKey: string;
  lockedAt: Date | null;
  snapshot: PeriodSnapshot | null;
};

export async function getPayPeriodState(
  storeId: string,
  periodKey: string
): Promise<PayPeriodState | null> {
  const row = await prisma.payPeriod.findUnique({
    where: { storeId_periodKey: { storeId, periodKey } },
  });
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    storeId: row.storeId,
    periodKey: row.periodKey,
    lockedAt: row.lockedAt,
    snapshot: row.snapshotJson ? parsePeriodSnapshot(row.snapshotJson) : null,
  };
}

export async function getJuly2026PayPeriodState(): Promise<PayPeriodState | null> {
  const store = await prisma.store.findUnique({
    where: { code: ZHONGSHAN_STORE_CODE },
  });
  if (!store) {
    return null;
  }
  return getPayPeriodState(store.id, JULY_2026_PERIOD_KEY);
}

export function isPayPeriodLocked(state: PayPeriodState | null): boolean {
  return Boolean(state?.lockedAt && state.snapshot);
}

export async function assertPayPeriodUnlocked(
  storeId: string,
  periodKey: string
): Promise<void> {
  const state = await getPayPeriodState(storeId, periodKey);
  if (isPayPeriodLocked(state)) {
    throw new Error("本期已鎖定，請先解鎖再修改");
  }
}
