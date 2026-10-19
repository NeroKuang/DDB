import type { AccountRole } from "@prisma/client";
import {
  BUILTIN_ROLLUP_FIELD_KEYS,
  type BuiltinRollupFieldKey,
  DEFAULT_ROLLUPS,
} from "@/compile/default-rollups";
import { invalidateCompileCache } from "@/compile/compile-cache";
import { resolveBusinessDayBounds } from "@/compile/resolve-business-days";
import type { Rollup } from "@/compile/types";
import { prisma } from "@/lib/prisma";
import { ensurePayPeriodRow } from "@/pay-period/ensure-period-row";

const VALID_ROLLUPS = new Set<Rollup>([
  "none",
  "addToMonthlyPay",
  "addToNetPay",
  "subtractFromNetPay",
]);

function requireAdmin(role: AccountRole): void {
  if (role !== "ADMIN") {
    throw new Error("只有 Admin 可以修改門市設定");
  }
}

function parseRollupsJson(raw: string | null): Record<string, Rollup> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, Rollup> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && VALID_ROLLUPS.has(value as Rollup)) {
        out[key] = value as Rollup;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export type StoreSettingsView = {
  storeId: string;
  demeritUnitAmount: number;
  rollups: Record<BuiltinRollupFieldKey, Rollup>;
  customItems: {
    id: string;
    name: string;
    rollup: Rollup;
    sortOrder: number;
  }[];
};

export async function loadStoreSettings(
  storeId: string
): Promise<StoreSettingsView | null> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      demeritUnitAmount: true,
      rollupsJson: true,
      customSalaryItems: {
        where: { archivedAt: null },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!store) {
    return null;
  }
  const overrides = parseRollupsJson(store.rollupsJson);
  const rollups = {} as Record<BuiltinRollupFieldKey, Rollup>;
  for (const key of BUILTIN_ROLLUP_FIELD_KEYS) {
    rollups[key] = overrides[key] ?? DEFAULT_ROLLUPS[key] ?? "none";
  }
  return {
    storeId: store.id,
    demeritUnitAmount: store.demeritUnitAmount,
    rollups,
    customItems: store.customSalaryItems.map((item) => ({
      id: item.id,
      name: item.name,
      rollup: VALID_ROLLUPS.has(item.rollup as Rollup)
        ? (item.rollup as Rollup)
        : "addToMonthlyPay",
      sortOrder: item.sortOrder,
    })),
  };
}

async function invalidateAllOpenCaches(storeId: string): Promise<void> {
  const periods = await prisma.payPeriod.findMany({
    where: { storeId, lockedAt: null },
    select: { periodKey: true },
  });
  await Promise.all(
    periods.map((period) => invalidateCompileCache(storeId, period.periodKey))
  );
}

export async function updateDemeritUnitAmount(input: {
  actorRole: AccountRole;
  storeId: string;
  demeritUnitAmount: number;
}): Promise<void> {
  requireAdmin(input.actorRole);
  if (
    !Number.isFinite(input.demeritUnitAmount) ||
    input.demeritUnitAmount < 0
  ) {
    throw new Error("單點金額必須為非負數字");
  }
  await prisma.store.update({
    where: { id: input.storeId },
    data: { demeritUnitAmount: input.demeritUnitAmount },
  });
  await invalidateAllOpenCaches(input.storeId);
}

export async function updateStoreRollups(input: {
  actorRole: AccountRole;
  storeId: string;
  rollups: Partial<Record<BuiltinRollupFieldKey, Rollup>>;
}): Promise<void> {
  requireAdmin(input.actorRole);
  const cleaned: Record<string, Rollup> = {};
  for (const key of BUILTIN_ROLLUP_FIELD_KEYS) {
    const value = input.rollups[key];
    if (value && VALID_ROLLUPS.has(value)) {
      const defaults = DEFAULT_ROLLUPS[key];
      if (value !== defaults) {
        cleaned[key] = value;
      }
    }
  }
  await prisma.store.update({
    where: { id: input.storeId },
    data: {
      rollupsJson:
        Object.keys(cleaned).length > 0 ? JSON.stringify(cleaned) : null,
    },
  });
  await invalidateAllOpenCaches(input.storeId);
}

export async function createCustomSalaryItem(input: {
  actorRole: AccountRole;
  storeId: string;
  name: string;
  rollup: Rollup;
}): Promise<void> {
  requireAdmin(input.actorRole);
  const name = input.name.trim();
  if (!name) {
    throw new Error("請填自訂薪資項目名稱");
  }
  if (!VALID_ROLLUPS.has(input.rollup)) {
    throw new Error("加總歸屬無效");
  }
  const maxSort = await prisma.storeCustomSalaryItem.aggregate({
    where: { storeId: input.storeId },
    _max: { sortOrder: true },
  });
  await prisma.storeCustomSalaryItem.create({
    data: {
      storeId: input.storeId,
      name,
      rollup: input.rollup,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });
  await invalidateAllOpenCaches(input.storeId);
}

export async function updateCustomSalaryItem(input: {
  actorRole: AccountRole;
  storeId: string;
  id: string;
  name: string;
  rollup: Rollup;
}): Promise<void> {
  requireAdmin(input.actorRole);
  const name = input.name.trim();
  if (!name) {
    throw new Error("請填自訂薪資項目名稱");
  }
  if (!VALID_ROLLUPS.has(input.rollup)) {
    throw new Error("加總歸屬無效");
  }
  const row = await prisma.storeCustomSalaryItem.findFirst({
    where: { id: input.id, storeId: input.storeId, archivedAt: null },
  });
  if (!row) {
    throw new Error("自訂薪資項目不存在");
  }
  await prisma.storeCustomSalaryItem.update({
    where: { id: input.id },
    data: { name, rollup: input.rollup },
  });
  await invalidateAllOpenCaches(input.storeId);
}

export async function archiveCustomSalaryItem(input: {
  actorRole: AccountRole;
  storeId: string;
  id: string;
}): Promise<void> {
  requireAdmin(input.actorRole);
  const row = await prisma.storeCustomSalaryItem.findFirst({
    where: { id: input.id, storeId: input.storeId, archivedAt: null },
  });
  if (!row) {
    throw new Error("自訂薪資項目不存在");
  }
  await prisma.storeCustomSalaryItem.update({
    where: { id: input.id },
    data: { archivedAt: new Date() },
  });
  await invalidateAllOpenCaches(input.storeId);
}

export async function loadPeriodBusinessDayBounds(
  storeId: string,
  periodKey: string
): Promise<{
  startIso: string;
  endIso: string;
  isOverride: boolean;
}> {
  const row = await prisma.payPeriod.findUnique({
    where: { storeId_periodKey: { storeId, periodKey } },
    select: {
      businessDayStartIso: true,
      businessDayEndIso: true,
    },
  });
  const resolved = await resolveBusinessDayBounds(storeId, periodKey);
  return {
    startIso: resolved.startIso,
    endIso: resolved.endIso,
    isOverride: Boolean(row?.businessDayStartIso && row?.businessDayEndIso),
  };
}

export async function updatePeriodBusinessDayBounds(input: {
  actorRole: AccountRole;
  storeId: string;
  periodKey: string;
  startIso: string;
  endIso: string;
}): Promise<void> {
  requireAdmin(input.actorRole);
  const start = new Date(input.startIso);
  const end = new Date(input.endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("營業日起訖格式無效");
  }
  if (start >= end) {
    throw new Error("營業日起點必須早於迄點");
  }
  await ensurePayPeriodRow(input.storeId, input.periodKey);
  await prisma.payPeriod.update({
    where: {
      storeId_periodKey: {
        storeId: input.storeId,
        periodKey: input.periodKey,
      },
    },
    data: {
      businessDayStartIso: start.toISOString(),
      businessDayEndIso: end.toISOString(),
    },
  });
  await invalidateCompileCache(input.storeId, input.periodKey);
}

export async function clearPeriodBusinessDayBounds(input: {
  actorRole: AccountRole;
  storeId: string;
  periodKey: string;
}): Promise<void> {
  requireAdmin(input.actorRole);
  await prisma.payPeriod.updateMany({
    where: { storeId: input.storeId, periodKey: input.periodKey },
    data: {
      businessDayStartIso: null,
      businessDayEndIso: null,
    },
  });
  await invalidateCompileCache(input.storeId, input.periodKey);
}
