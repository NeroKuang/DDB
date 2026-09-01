import type { AccountRole } from "@prisma/client";
import type { AdHocTask as CompileAdHocTask } from "@/compile/types";
import { prisma } from "@/lib/prisma";
import { roundMoney } from "@/lib/money";
import { assertPayPeriodUnlocked } from "@/pay-period/state";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

export { JULY_2026_PERIOD_KEY } from "@/lib/period-keys";

export type StoredAdHocTask = {
  id: string;
  staffId: string;
  primaryNickname: string;
  legalName: string;
  periodKey: string;
  name: string;
  storedAmount: number;
  confirmed: boolean;
};

function requireAdmin(actorRole: AccountRole): void {
  if (actorRole !== "ADMIN") {
    throw new Error("Only Admin can change 追加任務");
  }
}

async function assertAdHocTaskPeriodUnlocked(taskId: string): Promise<void> {
  const task = await prisma.adHocTask.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new Error("追加任務不存在");
  }
  await assertPayPeriodUnlocked(task.storeId, task.periodKey);
}

function mapRow(row: {
  id: string;
  staffId: string;
  periodKey: string;
  name: string;
  storedAmount: number;
  confirmed: boolean;
  staff: { primaryNickname: string; legalName: string };
}): StoredAdHocTask {
  return {
    id: row.id,
    staffId: row.staffId,
    primaryNickname: row.staff.primaryNickname,
    legalName: row.staff.legalName,
    periodKey: row.periodKey,
    name: row.name,
    storedAmount: row.storedAmount,
    confirmed: row.confirmed,
  };
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
  return rows.map(mapRow);
}

export async function listAllAdHocTasksForStoreCode(
  periodKey: string,
  storeCode = ZHONGSHAN_STORE_CODE
): Promise<
  {
    primaryNickname: string;
    name: string;
    storedAmount: number;
    confirmed: boolean;
  }[]
> {
  const store = await prisma.store.findUnique({ where: { code: storeCode } });
  if (!store) {
    return [];
  }
  const rows = await listAdHocTasksForPeriod(store.id, periodKey);
  return rows.map((row) => ({
    primaryNickname: row.primaryNickname,
    name: row.name,
    storedAmount: row.storedAmount,
    confirmed: row.confirmed,
  }));
}

/** Only confirmed tasks feed compile / 任務獎金. */
export async function listAdHocTasksForStoreCode(
  periodKey: string,
  storeCode = ZHONGSHAN_STORE_CODE
): Promise<CompileAdHocTask[]> {
  const store = await prisma.store.findUnique({ where: { code: storeCode } });
  if (!store) {
    return [];
  }
  const rows = await listAdHocTasksForPeriod(store.id, periodKey);
  return rows
    .filter((row) => row.confirmed)
    .map((row) => ({
      primaryNickname: row.primaryNickname,
      name: row.name,
      storedAmount: row.storedAmount,
    }));
}

export async function createAdHocTask(input: {
  actorRole: AccountRole;
  storeId: string;
  staffId: string;
  periodKey: string;
  name: string;
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
  const staff = await prisma.staff.findFirst({
    where: { id: input.staffId, storeId: input.storeId },
  });
  if (!staff) {
    throw new Error("店員不屬於此門市");
  }
  await assertPayPeriodUnlocked(input.storeId, periodKey);
  const row = await prisma.adHocTask.create({
    data: {
      storeId: input.storeId,
      staffId: input.staffId,
      periodKey,
      name,
      storedAmount: 0,
      confirmed: false,
    },
    include: { staff: true },
  });
  return mapRow(row);
}

export async function updateAdHocTaskStoredAmount(input: {
  actorRole: AccountRole;
  id: string;
  storedAmount: number;
}): Promise<StoredAdHocTask> {
  requireAdmin(input.actorRole);
  if (!(input.storedAmount >= 0)) {
    throw new Error("儲存值不可為負數");
  }
  await assertAdHocTaskPeriodUnlocked(input.id);
  const row = await prisma.adHocTask.update({
    where: { id: input.id },
    data: { storedAmount: roundMoney(input.storedAmount) },
    include: { staff: true },
  });
  return mapRow(row);
}

export async function confirmAdHocTask(input: {
  actorRole: AccountRole;
  id: string;
}): Promise<StoredAdHocTask> {
  requireAdmin(input.actorRole);
  await assertAdHocTaskPeriodUnlocked(input.id);
  const row = await prisma.adHocTask.update({
    where: { id: input.id },
    data: { confirmed: true },
    include: { staff: true },
  });
  return mapRow(row);
}

export async function unconfirmAdHocTask(input: {
  actorRole: AccountRole;
  id: string;
}): Promise<StoredAdHocTask> {
  requireAdmin(input.actorRole);
  await assertAdHocTaskPeriodUnlocked(input.id);
  const row = await prisma.adHocTask.update({
    where: { id: input.id },
    data: { confirmed: false },
    include: { staff: true },
  });
  return mapRow(row);
}

export async function deleteAdHocTask(input: {
  actorRole: AccountRole;
  id: string;
}): Promise<void> {
  requireAdmin(input.actorRole);
  await assertAdHocTaskPeriodUnlocked(input.id);
  await prisma.adHocTask.delete({ where: { id: input.id } });
}
