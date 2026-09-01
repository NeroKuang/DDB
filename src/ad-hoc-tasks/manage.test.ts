import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedZhongshanStoreAndStaff } from "@/staff/seed-zhongshan";
import {
  createAdHocTask,
  deleteAdHocTask,
  listAdHocTasksForPeriod,
} from "@/ad-hoc-tasks/manage";

const PERIOD_KEY = "2026-07";

describe("ad-hoc task CRUD", () => {
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

  it("lets Admin create and list 追加任務 for a period", async () => {
    const created = await createAdHocTask({
      actorRole: "ADMIN",
      storeId,
      staffId,
      periodKey: PERIOD_KEY,
      name: " 活動加碼 ",
      amount: 1000,
    });
    expect(created.name).toBe("活動加碼");
    expect(created.amount).toBe(1000);
    expect(created.primaryNickname).toBe("粉冥");

    const listed = await listAdHocTasksForPeriod(storeId, PERIOD_KEY);
    expect(listed).toEqual([
      expect.objectContaining({
        name: "活動加碼",
        amount: 1000,
        primaryNickname: "粉冥",
      }),
    ]);
  });

  it("rejects Supervisor create and invalid amount", async () => {
    await expect(
      createAdHocTask({
        actorRole: "SUPERVISOR",
        storeId,
        staffId,
        periodKey: PERIOD_KEY,
        name: "x",
        amount: 10,
      })
    ).rejects.toThrow(/Only Admin/);

    await expect(
      createAdHocTask({
        actorRole: "ADMIN",
        storeId,
        staffId,
        periodKey: PERIOD_KEY,
        name: "x",
        amount: 0,
      })
    ).rejects.toThrow(/金額/);
  });

  it("lets Admin delete 追加任務", async () => {
    const created = await createAdHocTask({
      actorRole: "ADMIN",
      storeId,
      staffId,
      periodKey: PERIOD_KEY,
      name: "臨時補貼",
      amount: 200,
    });
    await deleteAdHocTask({ actorRole: "ADMIN", id: created.id });
    const listed = await listAdHocTasksForPeriod(storeId, PERIOD_KEY);
    expect(listed.some((row) => row.id === created.id)).toBe(false);
  });
});
