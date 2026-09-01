import type { AccountRole } from "@prisma/client";
import type { PayRowOriginals, Venue } from "@/compile/types";
import { JULY_2026_PERIOD_KEY } from "@/ad-hoc-tasks/manage";
import { prisma } from "@/lib/prisma";
import { assertJulyPayPeriodUnlocked } from "@/pay-period/guards";
import { ensurePayPeriodRow } from "@/pay-period/ensure-period-row";

export type PayRowStoredRecord = {
  staffId: string;
  primaryNickname: string;
  venue: Venue;
  values: Partial<PayRowOriginals>;
};

const STORED_FIELDS: (keyof PayRowOriginals)[] = [
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

function parseValuesJson(raw: unknown): Partial<PayRowOriginals> {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const out: Partial<PayRowOriginals> = {};
  const obj = raw as Record<string, unknown>;
  for (const key of STORED_FIELDS) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = value;
    }
  }
  return out;
}

async function ensureJulyPayPeriod(storeId: string): Promise<string> {
  const row = await ensurePayPeriodRow(storeId, JULY_2026_PERIOD_KEY);
  return row.id;
}

export async function loadSavedStoredMap(
  storeId: string,
  periodKey: string
): Promise<Record<string, Partial<Record<Venue, Partial<PayRowOriginals>>>>> {
  const payPeriod = await prisma.payPeriod.findUnique({
    where: { storeId_periodKey: { storeId, periodKey } },
    include: {
      storedPayRows: { include: { staff: true } },
    },
  });
  if (!payPeriod) {
    return {};
  }
  const map: Record<
    string,
    Partial<Record<Venue, Partial<PayRowOriginals>>>
  > = {};
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
}): Promise<PayRowStoredRecord> {
  if (input.actorRole !== "ADMIN") {
    throw new Error("只有 Admin 可以修改薪資儲存值");
  }
  await assertJulyPayPeriodUnlocked(input.storeId);
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
  const payPeriodId = await ensureJulyPayPeriod(input.storeId);
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
  const merged: Partial<PayRowOriginals> = { ...prior, ...cleaned };
  for (const key of input.clearFields ?? []) {
    delete merged[key];
  }

  if (Object.keys(merged).length === 0) {
    await prisma.payRowStored.deleteMany({
      where: {
        payPeriodId,
        staffId: input.staffId,
        venue: input.venue,
      },
    });
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
  return {
    staffId: staff.id,
    primaryNickname: staff.primaryNickname,
    venue: input.venue,
    values: parseValuesJson(row.valuesJson),
  };
}
