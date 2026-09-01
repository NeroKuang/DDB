import type { AccountRole } from "@prisma/client";
import type { TemplateTask as CompileTemplateTask } from "@/compile/types";
import { prisma } from "@/lib/prisma";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";
import type { TaskTargetTier } from "@/template-tasks/compute";

export type StoredTemplateTask = {
  id: string;
  itemName: string;
  amountPerClick: number;
  tiers: TaskTargetTier[];
};

function requireAdmin(actorRole: AccountRole): void {
  if (actorRole !== "ADMIN") {
    throw new Error("Only Admin can change 模板任務");
  }
}

function normalizeTiers(tiers: TaskTargetTier[]): TaskTargetTier[] {
  const byMin = new Map<number, number>();
  for (const tier of tiers) {
    const minClicks = Math.trunc(tier.minClicks);
    if (!(minClicks > 0)) {
      throw new Error("任務達標門檻必須為正整數");
    }
    if (!(tier.bonusAmount > 0)) {
      throw new Error("任務達標額必須大於 0");
    }
    byMin.set(minClicks, tier.bonusAmount);
  }
  return [...byMin.entries()]
    .map(([minClicks, bonusAmount]) => ({ minClicks, bonusAmount }))
    .sort((a, b) => a.minClicks - b.minClicks);
}

export async function listTemplateTasksForStore(
  storeId: string
): Promise<StoredTemplateTask[]> {
  const rows = await prisma.templateTask.findMany({
    where: { storeId },
    include: { tiers: { orderBy: { minClicks: "asc" } } },
    orderBy: { itemName: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    itemName: row.itemName,
    amountPerClick: row.amountPerClick,
    tiers: row.tiers.map((tier) => ({
      minClicks: tier.minClicks,
      bonusAmount: tier.bonusAmount,
    })),
  }));
}

export async function listTemplateTasksForStoreCode(
  storeCode = ZHONGSHAN_STORE_CODE
): Promise<CompileTemplateTask[]> {
  const store = await prisma.store.findUnique({
    where: { code: storeCode },
    include: {
      templateTasks: {
        orderBy: { itemName: "asc" },
        include: { tiers: { orderBy: { minClicks: "asc" } } },
      },
    },
  });
  if (!store) {
    return [];
  }
  return store.templateTasks.map((row) => ({
    itemName: row.itemName,
    amountPerClick: row.amountPerClick,
    tiers: row.tiers.map((tier) => ({
      minClicks: tier.minClicks,
      bonusAmount: tier.bonusAmount,
    })),
  }));
}

export async function upsertTemplateTask(input: {
  actorRole: AccountRole;
  storeId: string;
  itemName: string;
  amountPerClick: number;
  tiers?: TaskTargetTier[];
}): Promise<StoredTemplateTask> {
  requireAdmin(input.actorRole);
  const itemName = input.itemName.trim();
  if (!itemName) {
    throw new Error("品項名不可空白");
  }
  if (!(input.amountPerClick >= 0) || Number.isNaN(input.amountPerClick)) {
    throw new Error("單筆任務獎金不可為負");
  }
  const tiers = normalizeTiers(input.tiers ?? []);
  if (!(input.amountPerClick > 0) && tiers.length === 0) {
    throw new Error("至少設定單筆任務獎金或一階任務達標");
  }

  const row = await prisma.$transaction(async (tx) => {
    const task = await tx.templateTask.upsert({
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
    await tx.templateTaskTier.deleteMany({
      where: { templateTaskId: task.id },
    });
    if (tiers.length > 0) {
      await tx.templateTaskTier.createMany({
        data: tiers.map((tier) => ({
          templateTaskId: task.id,
          minClicks: tier.minClicks,
          bonusAmount: tier.bonusAmount,
        })),
      });
    }
    return tx.templateTask.findUniqueOrThrow({
      where: { id: task.id },
      include: { tiers: { orderBy: { minClicks: "asc" } } },
    });
  });

  return {
    id: row.id,
    itemName: row.itemName,
    amountPerClick: row.amountPerClick,
    tiers: row.tiers.map((tier) => ({
      minClicks: tier.minClicks,
      bonusAmount: tier.bonusAmount,
    })),
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

/** Parse "10:500" lines / "10=500" / "10,500" into tiers. */
export function parseTiersText(text: string): TaskTargetTier[] {
  const lines = text
    .split(/[\n;]+/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.map((line) => {
    const match = line.match(/^(\d+(?:\.\d+)?)\s*[=:：,，]\s*(\d+(?:\.\d+)?)$/);
    if (!match) {
      throw new Error(`無法解析任務達標「${line}」，格式例如 10:500`);
    }
    return {
      minClicks: Number(match[1]),
      bonusAmount: Number(match[2]),
    };
  });
}

export function formatTiersText(tiers: TaskTargetTier[]): string {
  return tiers
    .map((tier) => `${tier.minClicks}:${tier.bonusAmount}`)
    .join("\n");
}
