import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { JULY_2026_PERIOD_KEY } from "@/ad-hoc-tasks/manage";
import { prisma } from "@/lib/prisma";
import { clearJulyPayPeriodLock } from "@/test-utils/clear-july-pay-period-lock";
import { seedZhongshanStoreAndStaff } from "@/staff/seed-zhongshan";
import {
  deleteTemplateTask,
  listTemplateTasksForStore,
  upsertTemplateTask,
} from "@/template-tasks/manage";

describe("template task CRUD", () => {
  let storeId = "";

  beforeAll(async () => {
    const seeded = await seedZhongshanStoreAndStaff();
    storeId = seeded.storeId;
    await prisma.templateTask.deleteMany({ where: { storeId } });
  });

  beforeEach(async () => {
    await clearJulyPayPeriodLock(storeId);
  });

  afterAll(async () => {
    await prisma.templateTask.deleteMany({ where: { storeId } });
  });

  it("lets Admin upsert by exact item name with optional 任務達標 tiers", async () => {
    const created = await upsertTemplateTask({
      actorRole: "ADMIN",
      storeId,
      itemName: " 修女貪杯 ",
      amountPerClick: 50,
      tiers: [
        { minClicks: 10, bonusAmount: 500 },
        { minClicks: 20, bonusAmount: 300 },
      ],
    });
    expect(created.itemName).toBe("修女貪杯");
    expect(created.amountPerClick).toBe(50);
    expect(created.tiers).toEqual([
      { minClicks: 10, bonusAmount: 500 },
      { minClicks: 20, bonusAmount: 300 },
    ]);

    const updated = await upsertTemplateTask({
      actorRole: "ADMIN",
      storeId,
      itemName: "修女貪杯",
      amountPerClick: 60,
      tiers: [{ minClicks: 15, bonusAmount: 200 }],
    });
    expect(updated.amountPerClick).toBe(60);
    expect(updated.tiers).toEqual([{ minClicks: 15, bonusAmount: 200 }]);

    const listed = await listTemplateTasksForStore(storeId);
    expect(listed).toEqual([
      expect.objectContaining({
        itemName: "修女貪杯",
        amountPerClick: 60,
        tiers: [{ minClicks: 15, bonusAmount: 200 }],
      }),
    ]);
  });

  it("rejects Supervisor create and personal create", async () => {
    await expect(
      upsertTemplateTask({
        actorRole: "SUPERVISOR",
        storeId,
        itemName: "合照",
        amountPerClick: 10,
      })
    ).rejects.toThrow(/Only Admin/);

    await expect(
      upsertTemplateTask({
        actorRole: "PERSONAL",
        storeId,
        itemName: "合照",
        amountPerClick: 10,
      })
    ).rejects.toThrow(/Only Admin/);
  });

  it("rejects empty config and empty item name", async () => {
    await expect(
      upsertTemplateTask({
        actorRole: "ADMIN",
        storeId,
        itemName: "合照",
        amountPerClick: 0,
        tiers: [],
      })
    ).rejects.toThrow(/至少設定/);

    await expect(
      upsertTemplateTask({
        actorRole: "ADMIN",
        storeId,
        itemName: "   ",
        amountPerClick: 10,
      })
    ).rejects.toThrow(/品項/);
  });

  it("allows 任務達標-only tasks", async () => {
    const created = await upsertTemplateTask({
      actorRole: "ADMIN",
      storeId,
      itemName: "合照",
      amountPerClick: 0,
      tiers: [{ minClicks: 5, bonusAmount: 100 }],
    });
    expect(created.amountPerClick).toBe(0);
    expect(created.tiers).toHaveLength(1);
  });

  it("lets Admin delete a template task", async () => {
    await upsertTemplateTask({
      actorRole: "ADMIN",
      storeId,
      itemName: "傳統禱告拍立得",
      amountPerClick: 30,
    });
    await deleteTemplateTask({
      actorRole: "ADMIN",
      storeId,
      itemName: "傳統禱告拍立得",
    });
    const listed = await listTemplateTasksForStore(storeId);
    expect(listed.some((row) => row.itemName === "傳統禱告拍立得")).toBe(false);
  });
});
