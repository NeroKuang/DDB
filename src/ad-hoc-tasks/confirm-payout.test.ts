import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { compilePayPeriod } from "@/compile/compile-pay-period";
import { zhongshanJuly2026Shop } from "@/compile/zhongshan-july-2026-shop";
import { prisma } from "@/lib/prisma";
import { seedZhongshanStoreAndStaff } from "@/staff/seed-zhongshan";
import {
  confirmAdHocTask,
  createAdHocTask,
  listAdHocTasksForStoreCode,
  updateAdHocTaskStoredAmount,
} from "@/ad-hoc-tasks/manage";

const PERIOD_KEY = "test-adhoc-confirm";

describe("ad-hoc task confirm payout", () => {
  let storeId = "";
  let staffId = "";

  beforeAll(async () => {
    const seeded = await seedZhongshanStoreAndStaff();
    storeId = seeded.storeId;
    const fen = await prisma.staff.findFirst({
      where: { storeId, primaryNickname: "粉冥" },
    });
    if (!fen) {
      throw new Error("粉冥 missing");
    }
    staffId = fen.id;
    await prisma.adHocTask.deleteMany({
      where: { storeId, periodKey: PERIOD_KEY },
    });
  });

  afterAll(async () => {
    await prisma.adHocTask.deleteMany({
      where: { storeId, periodKey: PERIOD_KEY },
    });
  });

  it("does not include unconfirmed 追加任務 in compile 任務獎金", async () => {
    await createAdHocTask({
      actorRole: "ADMIN",
      storeId,
      staffId,
      periodKey: PERIOD_KEY,
      name: "滿50小時獎金",
    });
    await updateAdHocTaskStoredAmount({
      actorRole: "ADMIN",
      id: (
        await prisma.adHocTask.findFirstOrThrow({
          where: { storeId, periodKey: PERIOD_KEY, name: "滿50小時獎金" },
        })
      ).id,
      storedAmount: 3000,
    });

    const forCompile = await listAdHocTasksForStoreCode(PERIOD_KEY);
    expect(forCompile).toEqual([]);

    const shop = zhongshanJuly2026Shop();
    const compiled = compilePayPeriod({
      shop: { ...shop, adHocTasks: forCompile },
      checkoutLines: [],
      punchPairs: [],
      noteClicks: [],
      noteOuterComplete: false,
    });
    const fenRow = compiled.payRows.find(
      (row) => row.primaryNickname === "粉冥" && row.venue === "frontOfHouse"
    );
    expect(fenRow?.original.taskBonus).toBe(0);
  });

  it("includes confirmed 追加任務 storedAmount in compile", async () => {
    await prisma.adHocTask.deleteMany({
      where: { storeId, periodKey: PERIOD_KEY },
    });
    const created = await createAdHocTask({
      actorRole: "ADMIN",
      storeId,
      staffId,
      periodKey: PERIOD_KEY,
      name: "活動加碼",
    });
    await updateAdHocTaskStoredAmount({
      actorRole: "ADMIN",
      id: created.id,
      storedAmount: 1500,
    });
    await confirmAdHocTask({ actorRole: "ADMIN", id: created.id });

    const forCompile = await listAdHocTasksForStoreCode(PERIOD_KEY);
    expect(forCompile).toContainEqual({
      primaryNickname: "粉冥",
      name: "活動加碼",
      storedAmount: 1500,
    });

    const shop = zhongshanJuly2026Shop();
    const compiled = compilePayPeriod({
      shop: { ...shop, adHocTasks: forCompile },
      checkoutLines: [],
      punchPairs: [],
      noteClicks: [],
      noteOuterComplete: false,
    });
    const fenRow = compiled.payRows.find(
      (row) => row.primaryNickname === "粉冥" && row.venue === "frontOfHouse"
    );
    expect(fenRow?.original.taskBonus).toBe(1500);
  });
});
