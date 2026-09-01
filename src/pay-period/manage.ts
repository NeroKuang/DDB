import type { AccountRole } from "@prisma/client";
import type { CompileResult } from "@/compile/types";
import { compilePayPeriodLive } from "@/compile/compile-for-period";
import { JULY_2026_PERIOD_KEY } from "@/lib/period-keys";
import { prisma } from "@/lib/prisma";
import { analyzeAllStaffPerformance } from "@/performance/analyze-staff-performance";
import type { StaffPerformanceView } from "@/performance/analyze-staff-performance";
import { loadJuly2026PerformanceInput } from "@/performance/load-july-performance";
import {
  serializePeriodSnapshot,
  type PeriodSnapshot,
} from "@/pay-period/snapshot";
import {
  getPayPeriodState,
  isPayPeriodLocked,
  type PayPeriodState,
} from "@/pay-period/state";

export type { PayPeriodState } from "@/pay-period/state";
export {
  assertPayPeriodUnlocked,
  getJuly2026PayPeriodState,
  getPayPeriodState,
  isPayPeriodLocked,
} from "@/pay-period/state";

function requireAdmin(actorRole: AccountRole): void {
  if (actorRole !== "ADMIN") {
    throw new Error("Only Admin can lock or unlock 薪資期間");
  }
}

export async function buildJuly2026PeriodSnapshot(
  storeId: string
): Promise<PeriodSnapshot> {
  const compiled = await compilePayPeriodLive({
    storeId,
    periodKey: JULY_2026_PERIOD_KEY,
  });
  const perfInput = await loadJuly2026PerformanceInput();
  const performanceSummaries = analyzeAllStaffPerformance({
    allStaff: perfInput.staff,
    checkoutLines: perfInput.checkoutLines,
    noteClicks: perfInput.noteClicks,
    templateTasks: perfInput.templateTasks,
    adHocTasks: perfInput.adHocTasks,
  });
  return {
    version: 1,
    periodLabel: compiled.periodLabel,
    periodKey: compiled.periodKey,
    lockedAtIso: new Date().toISOString(),
    compile: compiled.result,
    performanceSummaries,
  };
}

export async function lockPayPeriod(input: {
  actorRole: AccountRole;
  storeId: string;
  periodKey: string;
}): Promise<PayPeriodState> {
  requireAdmin(input.actorRole);
  if (input.periodKey !== JULY_2026_PERIOD_KEY) {
    throw new Error("第一期僅支援鎖定 2026-07");
  }
  const live = await compilePayPeriodLive({
    storeId: input.storeId,
    periodKey: input.periodKey,
  });
  if (!live.result.lockEligible) {
    throw new Error("未對上的暱稱未清空或必要匯入未齊，無法鎖定本期");
  }
  const snapshot = await buildJuly2026PeriodSnapshot(input.storeId);
  snapshot.lockedAtIso = new Date().toISOString();
  const row = await prisma.payPeriod.upsert({
    where: {
      storeId_periodKey: {
        storeId: input.storeId,
        periodKey: input.periodKey,
      },
    },
    create: {
      storeId: input.storeId,
      periodKey: input.periodKey,
      lockedAt: new Date(snapshot.lockedAtIso),
      snapshotJson: serializePeriodSnapshot(snapshot),
    },
    update: {
      lockedAt: new Date(snapshot.lockedAtIso),
      snapshotJson: serializePeriodSnapshot(snapshot),
    },
  });
  return {
    id: row.id,
    storeId: row.storeId,
    periodKey: row.periodKey,
    lockedAt: row.lockedAt,
    snapshot,
  };
}

export async function unlockPayPeriod(input: {
  actorRole: AccountRole;
  storeId: string;
  periodKey: string;
}): Promise<void> {
  requireAdmin(input.actorRole);
  const row = await prisma.payPeriod.findUnique({
    where: {
      storeId_periodKey: {
        storeId: input.storeId,
        periodKey: input.periodKey,
      },
    },
  });
  if (!row?.lockedAt) {
    throw new Error("本期尚未鎖定");
  }
  await prisma.payPeriod.update({
    where: { id: row.id },
    data: { lockedAt: null, snapshotJson: null },
  });
}

export function frozenCompileFromSnapshot(
  snapshot: PeriodSnapshot
): CompileResult {
  return snapshot.compile;
}

export function frozenPerformanceSummaries(
  snapshot: PeriodSnapshot
): StaffPerformanceView[] {
  return snapshot.performanceSummaries;
}

export function frozenPerformanceForNickname(
  snapshot: PeriodSnapshot,
  nickname: string
): StaffPerformanceView | undefined {
  return snapshot.performanceSummaries.find(
    (view) => view.primaryNickname === nickname
  );
}
