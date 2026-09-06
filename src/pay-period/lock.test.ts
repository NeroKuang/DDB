import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { JULY_2026_PERIOD_KEY } from "@/ad-hoc-tasks/manage";
import { prisma } from "@/lib/prisma";
import {
  assertPayPeriodUnlocked,
  getPayPeriodState,
  lockPayPeriod,
  unlockPayPeriod,
} from "@/pay-period/manage";
import {
  parsePeriodSnapshot,
  serializePeriodSnapshot,
  type PeriodSnapshot,
} from "@/pay-period/snapshot";
import { compileJuly2026PayrollLive } from "@/payroll/compile-july-payroll";
import { seedZhongshanStoreAndStaff } from "@/staff/seed-zhongshan";
import { clearJulyPayPeriodLock } from "@/test-utils/clear-july-pay-period-lock";

describe("pay period lock", () => {
  let storeId = "";

  beforeAll(async () => {
    const seeded = await seedZhongshanStoreAndStaff();
    storeId = seeded.storeId;
  });

  beforeEach(async () => {
    await clearJulyPayPeriodLock(storeId);
  });

  afterAll(async () => {
    await clearJulyPayPeriodLock(storeId);
  });

  it("round-trips snapshot JSON with line item dates", () => {
    const snapshot: PeriodSnapshot = {
      version: 1,
      periodLabel: "2026-07",
      periodKey: JULY_2026_PERIOD_KEY,
      lockedAtIso: "2026-08-01T00:00:00.000Z",
      compile: {
        payRows: [],
        unmatchedNicknames: [],
        blockingUnmatchedNicknames: [],
        unmatchedClicks: [],
        lockEligible: true,
        requiredImportsComplete: true,
      },
      performanceSummaries: [
        {
          primaryNickname: "粉冥",
          legalName: "測試",
          personalSales: { original: 100, stored: 100 },
          commission: { original: 0, stored: 0 },
          lineItems: [
            {
              at: new Date("2026-07-15T12:00:00.000Z"),
              nicknameUsed: "粉冥",
              orderer: "客人",
              amount: 100,
            },
          ],
          guestAnalysis: [],
          salesStats: [],
          noteList: [],
          adHocTasks: [],
          taskBonus: { original: 0, stored: 0 },
        },
      ],
    };
    const parsed = parsePeriodSnapshot(serializePeriodSnapshot(snapshot));
    expect(parsed.performanceSummaries[0]?.lineItems[0]?.at).toEqual(
      snapshot.performanceSummaries[0]!.lineItems[0]!.at
    );
  });

  it("blocks mutations when period is locked", async () => {
    const minimal: PeriodSnapshot = {
      version: 1,
      periodLabel: "test",
      periodKey: JULY_2026_PERIOD_KEY,
      lockedAtIso: new Date().toISOString(),
      compile: {
        payRows: [],
        unmatchedNicknames: [],
        blockingUnmatchedNicknames: [],
        unmatchedClicks: [],
        lockEligible: true,
        requiredImportsComplete: true,
      },
      performanceSummaries: [],
    };
    await prisma.payPeriod.create({
      data: {
        storeId,
        periodKey: JULY_2026_PERIOD_KEY,
        lockedAt: new Date(),
        snapshotJson: serializePeriodSnapshot(minimal),
      },
    });
    try {
      await expect(
        assertPayPeriodUnlocked(storeId, JULY_2026_PERIOD_KEY)
      ).rejects.toThrow(/已鎖定/);

      await unlockPayPeriod({
        actorRole: "ADMIN",
        storeId,
        periodKey: JULY_2026_PERIOD_KEY,
      });
      await expect(
        assertPayPeriodUnlocked(storeId, JULY_2026_PERIOD_KEY)
      ).resolves.toBeUndefined();
    } finally {
      await clearJulyPayPeriodLock(storeId);
    }
  });

  it("rejects non-Admin lock/unlock", async () => {
    await expect(
      lockPayPeriod({
        actorRole: "SUPERVISOR",
        storeId,
        periodKey: JULY_2026_PERIOD_KEY,
      })
    ).rejects.toThrow(/Only Admin/);
    await expect(
      unlockPayPeriod({
        actorRole: "SUPERVISOR",
        storeId,
        periodKey: JULY_2026_PERIOD_KEY,
      })
    ).rejects.toThrow(/Only Admin/);
  });

  it("locks July 2026 when live compile is lockEligible", async () => {
    const live = await compileJuly2026PayrollLive();
    if (!live.result.lockEligible) {
      return;
    }
    const state = await lockPayPeriod({
      actorRole: "ADMIN",
      storeId,
      periodKey: JULY_2026_PERIOD_KEY,
    });
    expect(state.lockedAt).toBeTruthy();
    expect(state.snapshot?.compile.payRows.length).toBeGreaterThan(0);

    const stored = await getPayPeriodState(storeId, JULY_2026_PERIOD_KEY);
    expect(stored?.lockedAt).toBeTruthy();
    expect(stored?.snapshot?.periodKey).toBe(JULY_2026_PERIOD_KEY);

    await unlockPayPeriod({
      actorRole: "ADMIN",
      storeId,
      periodKey: JULY_2026_PERIOD_KEY,
    });
  });
});
