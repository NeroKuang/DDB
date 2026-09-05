import { beforeAll, describe, expect, it } from "vitest";
import { JULY_2026_PERIOD_KEY } from "@/ad-hoc-tasks/manage";
import { prisma } from "@/lib/prisma";
import { serializePeriodSnapshot } from "@/pay-period/snapshot";
import { seedZhongshanStoreAndStaff } from "@/staff/seed-zhongshan";
import { clearJulyPayPeriodLock } from "@/test-utils/clear-july-pay-period-lock";
import { upsertTemplateTask } from "@/template-tasks/manage";
import { updateStaff } from "@/staff/manage";

async function lockJulyPeriod(storeId: string): Promise<void> {
  await prisma.payPeriod.upsert({
    where: {
      storeId_periodKey: { storeId, periodKey: JULY_2026_PERIOD_KEY },
    },
    create: {
      storeId,
      periodKey: JULY_2026_PERIOD_KEY,
      lockedAt: new Date(),
      snapshotJson: serializePeriodSnapshot({
        version: 1,
        periodLabel: "test",
        periodKey: JULY_2026_PERIOD_KEY,
        lockedAtIso: new Date().toISOString(),
        compile: {
          payRows: [],
          unmatchedNicknames: [],
          blockingUnmatchedNicknames: [],
          unmatchedClicks: [],
          lockEligible: false,
          requiredImportsComplete: false,
        },
        performanceSummaries: [],
      }),
    },
    update: {
      lockedAt: new Date(),
      snapshotJson: serializePeriodSnapshot({
        version: 1,
        periodLabel: "test",
        periodKey: JULY_2026_PERIOD_KEY,
        lockedAtIso: new Date().toISOString(),
        compile: {
          payRows: [],
          unmatchedNicknames: [],
          blockingUnmatchedNicknames: [],
          unmatchedClicks: [],
          lockEligible: false,
          requiredImportsComplete: false,
        },
        performanceSummaries: [],
      }),
    },
  });
}

describe("lock guards on payroll-affecting writes", () => {
  let storeId = "";
  let staffId = "";

  beforeAll(async () => {
    const seeded = await seedZhongshanStoreAndStaff();
    storeId = seeded.storeId;
    const staff = await prisma.staff.findFirst({
      where: { storeId, primaryNickname: "粉冥" },
    });
    if (!staff) {
      throw new Error("粉冥 missing");
    }
    staffId = staff.id;
  });

  it("blocks staff update and template task upsert when locked", async () => {
    await lockJulyPeriod(storeId);
    try {
      const staff = await prisma.staff.findUniqueOrThrow({
        where: { id: staffId },
      });
      await expect(
        updateStaff({
          actorRole: "ADMIN",
          id: staffId,
          data: {
            legalName: staff.legalName,
            primaryNickname: staff.primaryNickname,
            contactPhone: staff.contactPhone,
            aliases: [],
            title: staff.title,
            kind: "regular",
            guestPeriodKey: null,
            payKind: "hourly",
            hourlyRate: staff.hourlyRate,
            monthlyPay: staff.monthlyPay,
            commissionRate: staff.commissionRate,
            targetBonusAmount: staff.targetBonusAmount,
            laborHealthInsuranceAmount: staff.laborHealthInsuranceAmount,
            laborHealthInsuranceMode:
              staff.laborHealthInsuranceMode === "RATIO" ? "ratio" : "fixed",
            laborHealthInsuranceRatio: staff.laborHealthInsuranceRatio,
            laborHealthInsuranceCarryOverMonthly:
              staff.laborHealthInsuranceCarryOverMonthly,
            payNote: staff.payNote,
          },
        })
      ).rejects.toThrow(/已鎖定/);

      await expect(
        upsertTemplateTask({
          actorRole: "ADMIN",
          storeId,
          itemName: "測試品項",
          amountPerClick: 100,
        })
      ).rejects.toThrow(/已鎖定/);
    } finally {
      await clearJulyPayPeriodLock(storeId);
    }
  });
});
