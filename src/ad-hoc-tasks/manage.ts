import type { AccountRole } from "@prisma/client";
import type { AdHocTask as CompileAdHocTask } from "@/compile/types";
import { prisma } from "@/lib/prisma";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

export const JULY_2026_PERIOD_KEY = "2026-07";

export type StoredAdHocTask = {
  id: string;
  staffId: string;
  primaryNickname: string;
  legalName: string;
  periodKey: string;
  name: string;
  amount: number;
};

function requireAdmin(actorRole: AccountRole): void {
  if (actorRole !== "ADMIN") {
    throw new Error("Only Admin can change 追加任務");
  }
}

export async function listAdHocTasksForPeriod(
  storeId: string,
  periodKey: string
): Promise<StoredAdHocTask[]> {
  const rows = await prisma.adHocTask.findMany({
    where: { storeId, periodKey },
    include: { staff: true },
    orderBy: [{ staff: { primaryNickname: "asc" } }, { name: "asc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    staffId: row.staffId,
    primaryNickname: row.staff.primaryNickname,
    legalName: row.staff.legalName,
    periodKey: row.periodKey,
    name: row.name,
    amount: row.amount,
  }));
}

export async function listAdHocTasksForStoreCode(
  periodKey: string,
  storeCode = ZHONGSHAN_STORE_CODE
): Promise<CompileAdHocTask[]> {
  const store = await prisma.store.findUnique({ where: { code: storeCode } });
  if (!store) {
    return [];
  }
  const rows = await listAdHocTasksForPeriod(store.id, periodKey);
  return rows.map((row) => ({
    primaryNickname: row.primaryNickname,
    name: row.name,
    amount: row.amount,
  }));
}

export async function createAdHocTask(input: {
  actorRole: AccountRole;
  storeId: string;
  staffId: string;
  periodKey: string;
  name: string;
  amount: number;
}): Promise<StoredAdHocTask> {
  requireAdmin(input.actorRole);
  const name = input.name.trim();
  const periodKey = input.periodKey.trim();
  if (!name) {
    throw new Error("追加任務名稱不可空白");
  }
  if (!periodKey) {
    throw new Error("薪資期間不可空白");
  }
  if (!(input.amount > 0)) {
    throw new Error("追加任務金額必須大於 0");
  }
  const staff = await prisma.staff.findFirst({
    where: { id: input.staffId, storeId: input.storeId },
  });
  if (!staff) {
    throw new Error("店員不屬於此門市");
  }
  const row = await prisma.adHocTask.create({
    data: {
      storeId: input.storeId,
      staffId: input.staffId,
      periodKey,
      name,
      amount: input.amount,
    },
    include: { staff: true },
  });
  return {
    id: row.id,
    staffId: row.staffId,
    primaryNickname: row.staff.primaryNickname,
    legalName: row.staff.legalName,
    periodKey: row.periodKey,
    name: row.name,
    amount: row.amount,
  };
}

export async function deleteAdHocTask(input: {
  actorRole: AccountRole;
  id: string;
}): Promise<void> {
  requireAdmin(input.actorRole);
  await prisma.adHocTask.delete({ where: { id: input.id } });
}
