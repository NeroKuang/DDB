import type { AccountRole } from "@prisma/client";
import type { TemplateTask as CompileTemplateTask } from "@/compile/types";
import { prisma } from "@/lib/prisma";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

export type StoredTemplateTask = {
  id: string;
  itemName: string;
  amountPerClick: number;
};

function requireAdmin(actorRole: AccountRole): void {
  if (actorRole !== "ADMIN") {
    throw new Error("Only Admin can change 模板任務");
  }
}

export async function listTemplateTasksForStore(
  storeId: string
): Promise<StoredTemplateTask[]> {
  const rows = await prisma.templateTask.findMany({
    where: { storeId },
    orderBy: { itemName: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    itemName: row.itemName,
    amountPerClick: row.amountPerClick,
  }));
}

export async function listTemplateTasksForStoreCode(
  storeCode = ZHONGSHAN_STORE_CODE
): Promise<CompileTemplateTask[]> {
  const store = await prisma.store.findUnique({
    where: { code: storeCode },
    include: { templateTasks: { orderBy: { itemName: "asc" } } },
  });
  if (!store) {
    return [];
  }
  return store.templateTasks.map((row) => ({
    itemName: row.itemName,
    amountPerClick: row.amountPerClick,
  }));
}

export async function upsertTemplateTask(input: {
  actorRole: AccountRole;
  storeId: string;
  itemName: string;
  amountPerClick: number;
}): Promise<StoredTemplateTask> {
  requireAdmin(input.actorRole);
  const itemName = input.itemName.trim();
  if (!itemName) {
    throw new Error("品項名不可空白");
  }
  if (!(input.amountPerClick > 0)) {
    throw new Error("單筆任務獎金必須大於 0");
  }
  const row = await prisma.templateTask.upsert({
    where: {
      storeId_itemName: { storeId: input.storeId, itemName },
    },
    create: {
      storeId: input.storeId,
      itemName,
      amountPerClick: input.amountPerClick,
    },
    update: { amountPerClick: input.amountPerClick },
  });
  return {
    id: row.id,
    itemName: row.itemName,
    amountPerClick: row.amountPerClick,
  };
}

export async function deleteTemplateTask(input: {
  actorRole: AccountRole;
  storeId: string;
  itemName: string;
}): Promise<void> {
  requireAdmin(input.actorRole);
  const itemName = input.itemName.trim();
  await prisma.templateTask.deleteMany({
    where: { storeId: input.storeId, itemName },
  });
}
