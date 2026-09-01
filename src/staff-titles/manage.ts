import type { AccountRole } from "@prisma/client";
import { zhongshanJuly2026Shop } from "@/compile/zhongshan-july-2026-shop";
import { prisma } from "@/lib/prisma";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

function requireAdmin(actorRole: AccountRole): void {
  if (actorRole !== "ADMIN") {
    throw new Error("只有 Admin 可以維護職稱清單");
  }
}

export async function seedStaffTitlesFromFixture(
  storeCode = ZHONGSHAN_STORE_CODE
): Promise<number> {
  const store = await prisma.store.findUnique({ where: { code: storeCode } });
  if (!store) {
    return 0;
  }
  const labels = new Set<string>();
  for (const person of zhongshanJuly2026Shop().staff) {
    const label = person.title.trim();
    if (label) {
      labels.add(label);
    }
  }
  for (const preset of ["店長", "公關", "不保", "契約", "排班"]) {
    labels.add(preset);
  }
  let seeded = 0;
  for (const label of labels) {
    const result = await prisma.staffTitle.createMany({
      data: [{ storeId: store.id, label }],
      skipDuplicates: true,
    });
    seeded += result.count;
  }
  return seeded;
}

export async function listStaffTitles(storeId: string): Promise<string[]> {
  const rows = await prisma.staffTitle.findMany({
    where: { storeId },
    orderBy: { label: "asc" },
  });
  return rows.map((row) => row.label);
}

export async function addStaffTitle(input: {
  actorRole: AccountRole;
  storeId: string;
  label: string;
}): Promise<string[]> {
  requireAdmin(input.actorRole);
  const label = input.label.trim();
  if (!label) {
    throw new Error("職稱不可空白");
  }
  await prisma.staffTitle.create({
    data: { storeId: input.storeId, label },
  });
  return listStaffTitles(input.storeId);
}

export async function deleteStaffTitle(input: {
  actorRole: AccountRole;
  storeId: string;
  label: string;
}): Promise<string[]> {
  requireAdmin(input.actorRole);
  await prisma.staffTitle.deleteMany({
    where: { storeId: input.storeId, label: input.label.trim() },
  });
  return listStaffTitles(input.storeId);
}
