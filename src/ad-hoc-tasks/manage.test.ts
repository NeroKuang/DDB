import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedZhongshanStoreAndStaff } from "@/staff/seed-zhongshan";
import {
  confirmAdHocTask,
  createAdHocTask,
  deleteAdHocTask,
  listAdHocTasksForPeriod,
  updateAdHocTaskStoredAmount,
} from "@/ad-hoc-tasks/manage";

const PERIOD_KEY = "test-adhoc-crud";

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

  it("lets Admin create 追加任務 with name only (stored 0, unconfirmed)", async () => {
    const created = await createAdHocTask({
      actorRole: "ADMIN",
      storeId,
      staffId,
      periodKey: PERIOD_KEY,
      name: " 活動加碼 ",
    });
    expect(created.name).toBe("活動加碼");
    expect(created.storedAmount).toBe(0);
    expect(created.confirmed).toBe(false);
    expect(created.primaryNickname).toBe("粉冥");

    const listed = await listAdHocTasksForPeriod(storeId, PERIOD_KEY);
    expect(listed.filter((row) => row.name === "活動加碼")).toEqual([
      expect.objectContaining({
        name: "活動加碼",
        storedAmount: 0,
        confirmed: false,
        primaryNickname: "粉冥",
      }),
    ]);
  });

  it("rejects Supervisor create and negative stored amount", async () => {
    await expect(
      createAdHocTask({
        actorRole: "SUPERVISOR",
        storeId,
        staffId,
        periodKey: PERIOD_KEY,
        name: "x",
      })
    ).rejects.toThrow(/Only Admin/);

    const row = await prisma.adHocTask.findFirstOrThrow({
      where: { storeId, periodKey: PERIOD_KEY },
    });
    await expect(
      updateAdHocTaskStoredAmount({
        actorRole: "ADMIN",
        id: row.id,
        storedAmount: -1,
      })
    ).rejects.toThrow(/儲存值/);
  });

  it("lets Admin update stored amount, confirm, and delete", async () => {
    await prisma.adHocTask.deleteMany({
      where: { storeId, periodKey: PERIOD_KEY },
    });
    const created = await createAdHocTask({
      actorRole: "ADMIN",
      storeId,
      staffId,
      periodKey: PERIOD_KEY,
      name: "臨時補貼",
    });
    await updateAdHocTaskStoredAmount({
      actorRole: "ADMIN",
      id: created.id,
      storedAmount: 200,
    });
    const confirmed = await confirmAdHocTask({
      actorRole: "ADMIN",
      id: created.id,
    });
    expect(confirmed.confirmed).toBe(true);
    expect(confirmed.storedAmount).toBe(200);

    await deleteAdHocTask({ actorRole: "ADMIN", id: created.id });
    const listed = await listAdHocTasksForPeriod(storeId, PERIOD_KEY);
    expect(listed.some((row) => row.id === created.id)).toBe(false);
  });
});
