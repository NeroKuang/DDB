import type { AccountRole } from "@prisma/client";
import type { PayRowOriginals, Venue } from "@/compile/types";
import { invalidateCompileCache } from "@/compile/compile-cache";
import { prisma } from "@/lib/prisma";
import { assertPayPeriodUnlockedForWrite } from "@/pay-period/guards";
import { ensurePayPeriodRow } from "@/pay-period/ensure-period-row";
import {
  CUSTOM_VALUES_JSON_KEY,
  type SavedStoredWithCustom,
} from "@/pay-row-stored/custom-values";

export type PayRowStoredRecord = {
  staffId: string;
  primaryNickname: string;
  venue: Venue;
  values: SavedStoredWithCustom;
};

export type StoredOverrideCell = {
  staffId: string;
  primaryNickname: string;
  venue: Venue;
  field: keyof PayRowOriginals;
  value: number;
};

export type SavedStoredMap = Record<
  string,
  Partial<Record<Venue, SavedStoredWithCustom>>
>;

export const STORED_FIELDS: (keyof PayRowOriginals)[] = [
  "hours",
  "basePay",
  "sales",
  "commission",
  "targetBonus",
  "taskBonus",
  "allowance",
  "demerits",
  "deduction",
  "overtimeWithHoliday",
  "overtimeWithoutHoliday",
  "repayment",
  "photoCommission",
  "laborHealthInsurance",
  "monthlyPay",
  "netPay",
];

export function storedOverrideKey(cell: {
  staffId: string;
  venue: Venue;
  field: string;
}): string {
  return `${cell.staffId}|${cell.venue}|${cell.field}`;
}

export function flattenStoredOverrides(
  records: PayRowStoredRecord[]
): StoredOverrideCell[] {
  const cells: StoredOverrideCell[] = [];
  for (const row of records) {
    for (const field of STORED_FIELDS) {
      const value = row.values[field];
      if (typeof value === "number" && Number.isFinite(value)) {
        cells.push({
          staffId: row.staffId,
          primaryNickname: row.primaryNickname,
          venue: row.venue,
          field,
          value,
        });
      }
    }
  }
  return cells;
}

function parseValuesJson(raw: unknown): SavedStoredWithCustom {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const out: SavedStoredWithCustom = {};
  const obj = raw as Record<string, unknown>;
  for (const key of STORED_FIELDS) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = value;
    }
  }
  const customRaw = obj[CUSTOM_VALUES_JSON_KEY];
  if (customRaw && typeof customRaw === "object") {
    const custom: Record<string, number> = {};
    for (const [id, value] of Object.entries(
      customRaw as Record<string, unknown>
    )) {
      if (typeof value === "number" && Number.isFinite(value)) {
        custom[id] = value;
      }
    }
    if (Object.keys(custom).length > 0) {
      out[CUSTOM_VALUES_JSON_KEY] = custom;
    }
  }
  return out;
}

async function ensurePayPeriodId(
  storeId: string,
  periodKey: string
): Promise<string> {
  const row = await ensurePayPeriodRow(storeId, periodKey);
  return row.id;
}

export async function loadSavedStoredMap(
  storeId: string,
  periodKey: string
): Promise<SavedStoredMap> {
  const payPeriod = await prisma.payPeriod.findUnique({
    where: { storeId_periodKey: { storeId, periodKey } },
    include: {
      storedPayRows: { include: { staff: true } },
    },
  });
  if (!payPeriod) {
    return {};
  }
  const map: SavedStoredMap = {};
  for (const row of payPeriod.storedPayRows) {
    const nickname = row.staff.primaryNickname;
    const venue = row.venue as Venue;
    if (!map[nickname]) {
      map[nickname] = {};
    }
    map[nickname]![venue] = parseValuesJson(row.valuesJson);
  }
  return map;
}

export async function listPayRowStored(
  storeId: string,
  periodKey: string
): Promise<PayRowStoredRecord[]> {
  const payPeriod = await prisma.payPeriod.findUnique({
    where: { storeId_periodKey: { storeId, periodKey } },
    include: {
      storedPayRows: {
        include: { staff: true },
        orderBy: [{ staff: { primaryNickname: "asc" } }, { venue: "asc" }],
      },
    },
  });
  if (!payPeriod) {
    return [];
  }
  return payPeriod.storedPayRows.map((row) => ({
    staffId: row.staffId,
    primaryNickname: row.staff.primaryNickname,
    venue: row.venue as Venue,
    values: parseValuesJson(row.valuesJson),
  }));
}

export async function upsertPayRowStored(input: {
  actorRole: AccountRole;
  storeId: string;
  periodKey: string;
  staffId: string;
  venue: Venue;
  values: Partial<PayRowOriginals>;
  clearFields?: (keyof PayRowOriginals)[];
  customValues?: Record<string, number | null>;
}): Promise<PayRowStoredRecord> {
  if (input.actorRole !== "ADMIN") {
    throw new Error("只有 Admin 可以修改薪資儲存值");
  }
  await assertPayPeriodUnlockedForWrite(input.storeId, input.periodKey);
  const staff = await prisma.staff.findUnique({ where: { id: input.staffId } });
  if (!staff || staff.storeId !== input.storeId) {
    throw new Error("店員不存在");
  }
  const cleaned: Partial<PayRowOriginals> = {};
  for (const key of STORED_FIELDS) {
    const value = input.values[key];
    if (value !== undefined && Number.isFinite(value)) {
      cleaned[key] = value;
    }
  }
  const payPeriodId = await ensurePayPeriodId(input.storeId, input.periodKey);
  const existing = await prisma.payRowStored.findUnique({
    where: {
      payPeriodId_staffId_venue: {
        payPeriodId,
        staffId: input.staffId,
        venue: input.venue,
      },
    },
  });
  const prior = existing ? parseValuesJson(existing.valuesJson) : {};
  const merged: SavedStoredWithCustom = { ...prior, ...cleaned };
  for (const key of input.clearFields ?? []) {
    delete merged[key];
  }
  if (input.customValues) {
    const custom = { ...(prior[CUSTOM_VALUES_JSON_KEY] ?? {}) };
    for (const [id, value] of Object.entries(input.customValues)) {
      if (value === null) {
        delete custom[id];
      } else if (Number.isFinite(value)) {
        custom[id] = value;
      }
    }
    if (Object.keys(custom).length === 0) {
      delete merged[CUSTOM_VALUES_JSON_KEY];
    } else {
      merged[CUSTOM_VALUES_JSON_KEY] = custom;
    }
  }

  if (Object.keys(merged).length === 0) {
    await prisma.payRowStored.deleteMany({
      where: {
        payPeriodId,
        staffId: input.staffId,
        venue: input.venue,
      },
    });
    await invalidateCompileCache(input.storeId, input.periodKey);
    return {
      staffId: staff.id,
      primaryNickname: staff.primaryNickname,
      venue: input.venue,
      values: {},
    };
  }
  const row = await prisma.payRowStored.upsert({
    where: {
      payPeriodId_staffId_venue: {
        payPeriodId,
        staffId: input.staffId,
        venue: input.venue,
      },
    },
    create: {
      payPeriodId,
      staffId: input.staffId,
      venue: input.venue,
      valuesJson: merged,
    },
    update: { valuesJson: merged },
  });
  await invalidateCompileCache(input.storeId, input.periodKey);
  return {
    staffId: staff.id,
    primaryNickname: staff.primaryNickname,
    venue: input.venue,
    values: parseValuesJson(row.valuesJson),
  };
}

/**
 * Keep only the listed override cells; delete every other stored field for this period.
 * Used by manual 重算 when Admin unchecks cells (or clears all).
 */
export async function retainStoredOverrides(input: {
  actorRole: AccountRole;
  storeId: string;
  periodKey: string;
  keepKeys: ReadonlySet<string> | string[];
}): Promise<{ kept: number; cleared: number }> {
  if (input.actorRole !== "ADMIN") {
    throw new Error("只有 Admin 可以修改薪資儲存值");
  }
  await assertPayPeriodUnlockedForWrite(input.storeId, input.periodKey);
  const keep = new Set(
    (Array.isArray(input.keepKeys)
      ? input.keepKeys
      : [...input.keepKeys]
    ).filter(Boolean)
  );
  const payPeriod = await prisma.payPeriod.findUnique({
    where: {
      storeId_periodKey: { storeId: input.storeId, periodKey: input.periodKey },
    },
    include: {
      storedPayRows: { include: { staff: true } },
    },
  });
  if (!payPeriod) {
    return { kept: 0, cleared: 0 };
  }
  let kept = 0;
  let cleared = 0;
  for (const row of payPeriod.storedPayRows) {
    const prior = parseValuesJson(row.valuesJson);
    const next: SavedStoredWithCustom = {};
    for (const field of STORED_FIELDS) {
      const value = prior[field];
      if (typeof value !== "number" || !Number.isFinite(value)) {
        continue;
      }
      const key = storedOverrideKey({
        staffId: row.staffId,
        venue: row.venue as Venue,
        field,
      });
      if (keep.has(key)) {
        next[field] = value;
        kept += 1;
      } else {
        cleared += 1;
      }
    }
    const priorCustom = prior[CUSTOM_VALUES_JSON_KEY] ?? {};
    const nextCustom: Record<string, number> = {};
    for (const [itemId, value] of Object.entries(priorCustom)) {
      const key = storedOverrideKey({
        staffId: row.staffId,
        venue: row.venue as Venue,
        field: `custom:${itemId}`,
      });
      if (keep.has(key)) {
        nextCustom[itemId] = value;
        kept += 1;
      } else {
        cleared += 1;
      }
    }
    if (Object.keys(nextCustom).length > 0) {
      next[CUSTOM_VALUES_JSON_KEY] = nextCustom;
    }
    if (Object.keys(next).length === 0) {
      await prisma.payRowStored.delete({ where: { id: row.id } });
    } else {
      await prisma.payRowStored.update({
        where: { id: row.id },
        data: { valuesJson: next },
      });
    }
  }
  await invalidateCompileCache(input.storeId, input.periodKey);
  return { kept, cleared };
}
