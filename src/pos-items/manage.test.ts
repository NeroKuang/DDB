import { describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { syncPosItemsFromImportRun } from "@/pos-items/manage";
import { seedZhongshanStoreAndStaff } from "@/staff/seed-zhongshan";

describe("syncPosItemsFromImportRun", () => {
  it("creates items from note clicks without overwriting unitPrice", async () => {
    const seeded = await seedZhongshanStoreAndStaff();
    const periodKey = `2099-pos-${randomUUID().slice(0, 8)}`;
    const period = await prisma.payPeriod.create({
      data: {
        storeId: seeded.storeId,
        periodKey,
      },
    });
    const run = await prisma.importRun.create({
      data: {
        payPeriodId: period.id,
        source: "ADMIN_UPLOAD",
        status: "SUCCEEDED",
        noteClicks: {
          create: [
            { itemName: "測試品項A", nickname: "粉冥", clicks: 3 },
            { itemName: "測試品項B", nickname: "粉冥", clicks: 1 },
          ],
        },
      },
    });

    const first = await syncPosItemsFromImportRun(run.id);
    expect(first.created).toBe(2);

    await prisma.posItem.updateMany({
      where: { storeId: seeded.storeId, name: "測試品項A" },
      data: { unitPrice: 300 },
    });

    await prisma.importNoteClick.create({
      data: {
        importRunId: run.id,
        itemName: "測試品項C",
        nickname: "粉冥",
        clicks: 2,
      },
    });

    const second = await syncPosItemsFromImportRun(run.id);
    expect(second.created).toBe(1);

    const itemA = await prisma.posItem.findUniqueOrThrow({
      where: {
        storeId_name: { storeId: seeded.storeId, name: "測試品項A" },
      },
    });
    expect(itemA.unitPrice).toBe(300);

    await prisma.importRun.deleteMany({ where: { payPeriodId: period.id } });
    await prisma.payPeriod.delete({ where: { id: period.id } });
    await prisma.posItem.deleteMany({
      where: {
        storeId: seeded.storeId,
        name: { in: ["測試品項A", "測試品項B", "測試品項C"] },
      },
    });
  });
});
