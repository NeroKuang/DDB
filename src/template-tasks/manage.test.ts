import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
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

  afterAll(async () => {
    await prisma.templateTask.deleteMany({ where: { storeId } });
  });

  it("lets Admin upsert by exact item name and list tasks", async () => {
    const created = await upsertTemplateTask({
      actorRole: "ADMIN",
      storeId,
      itemName: " 修女貪杯 ",
      amountPerClick: 50,
    });
    expect(created.itemName).toBe("修女貪杯");
    expect(created.amountPerClick).toBe(50);

    const updated = await upsertTemplateTask({
      actorRole: "ADMIN",
      storeId,
      itemName: "修女貪杯",
      amountPerClick: 60,
    });
    expect(updated.amountPerClick).toBe(60);

    const listed = await listTemplateTasksForStore(storeId);
    expect(listed).toEqual([
      expect.objectContaining({ itemName: "修女貪杯", amountPerClick: 60 }),
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

  it("rejects non-positive 單筆任務獎金 and empty item name", async () => {
    await expect(
      upsertTemplateTask({
        actorRole: "ADMIN",
        storeId,
        itemName: "合照",
        amountPerClick: 0,
      })
    ).rejects.toThrow(/單筆任務獎金/);

    await expect(
      upsertTemplateTask({
        actorRole: "ADMIN",
        storeId,
        itemName: "   ",
        amountPerClick: 10,
      })
    ).rejects.toThrow(/品項/);
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
