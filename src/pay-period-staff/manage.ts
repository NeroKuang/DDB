import type { AccountRole } from "@prisma/client";
import { zhongshanJuly2026Shop } from "@/compile/zhongshan-july-2026-shop";
import type { PeriodStaffInput } from "@/compile/types";
import { assertPayPeriodUnlockedForWrite } from "@/pay-period/guards";
import { ensurePayPeriodRow } from "@/pay-period/ensure-period-row";
import {
  DEFAULT_PERIOD_STAFF_SETTINGS,
  type PeriodStaffSettingsJson,
} from "@/pay-period-staff/types";
import { JULY_2026_PERIOD_KEY } from "@/lib/period-keys";
import { prisma } from "@/lib/prisma";
import { staffWhereForPayPeriod } from "@/staff/guest-period";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

export type PeriodStaffRecord = {
  staffId: string;
  primaryNickname: string;
  legalName: string;
  /** Glossary: 一般店員 | 客座店員 */
  kind: "regular" | "guest";
  laborHealthInsuranceCarryOverMonthly: boolean;
  settings: PeriodStaffSettingsJson;
};

function requireAdmin(actorRole: AccountRole): void {
  if (actorRole !== "ADMIN") {
    throw new Error("只有 Admin 可以修改本期店員設定");
  }
}

function parseSettingsJson(raw: unknown): PeriodStaffSettingsJson {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_PERIOD_STAFF_SETTINGS };
  }
  const obj = raw as Record<string, unknown>;
  return {
    ...DEFAULT_PERIOD_STAFF_SETTINGS,
    ...(obj as PeriodStaffSettingsJson),
  };
}

async function ensurePayPeriodId(
  storeId: string,
  periodKey: string
): Promise<string> {
  const row = await ensurePayPeriodRow(storeId, periodKey);
  return row.id;
}

async function loadStaffSettingsForPeriod(
  storeId: string,
  periodKey: string
): Promise<{
  staff: Array<{
    id: string;
    primaryNickname: string;
    legalName: string;
    kind: "REGULAR" | "GUEST";
    laborHealthInsuranceCarryOverMonthly: boolean;
  }>;
  settingsByStaffId: Map<string, PeriodStaffSettingsJson>;
}> {
  const staff = await prisma.staff.findMany({
    where: staffWhereForPayPeriod(storeId, periodKey),
    orderBy: { primaryNickname: "asc" },
    select: {
      id: true,
      primaryNickname: true,
      legalName: true,
      kind: true,
      laborHealthInsuranceCarryOverMonthly: true,
    },
  });
  const settingsByStaffId = new Map<string, PeriodStaffSettingsJson>();
  const payPeriod = await prisma.payPeriod.findUnique({
    where: { storeId_periodKey: { storeId, periodKey } },
    select: { id: true },
  });
  if (payPeriod) {
    const rows = await prisma.payPeriodStaffSetting.findMany({
      where: { payPeriodId: payPeriod.id },
    });
    for (const row of rows) {
      settingsByStaffId.set(row.staffId, parseSettingsJson(row.settingsJson));
    }
  }
  return { staff, settingsByStaffId };
}

function settingsForStaff(
  staffId: string,
  settingsByStaffId: Map<string, PeriodStaffSettingsJson>
): PeriodStaffSettingsJson {
  return settingsByStaffId.get(staffId) ?? { ...DEFAULT_PERIOD_STAFF_SETTINGS };
}

export async function seedJulyPeriodStaffFromFixture(
  storeCode = ZHONGSHAN_STORE_CODE
): Promise<number> {
  const store = await prisma.store.findUnique({ where: { code: storeCode } });
  if (!store) {
    return 0;
  }
  const payPeriodId = await ensurePayPeriodId(store.id, JULY_2026_PERIOD_KEY);
  const existing = await prisma.payPeriodStaffSetting.count({
    where: { payPeriodId },
  });
  if (existing > 0) {
    return 0;
  }
  const fixture = zhongshanJuly2026Shop().periodStaff;
  const staffRows = await prisma.staff.findMany({
    where: { storeId: store.id },
  });
  const byNickname = new Map(
    staffRows.map((row) => [row.primaryNickname, row.id])
  );
  let seeded = 0;
  const toCreate: {
    payPeriodId: string;
    staffId: string;
    settingsJson: Omit<PeriodStaffInput, "primaryNickname">;
  }[] = [];
  for (const input of fixture) {
    const staffId = byNickname.get(input.primaryNickname);
    if (!staffId) {
      continue;
    }
    const { primaryNickname: _drop, ...settings } = input;
    toCreate.push({ payPeriodId, staffId, settingsJson: settings });
    seeded += 1;
  }
  if (toCreate.length > 0) {
    await prisma.payPeriodStaffSetting.createMany({
      data: toCreate,
      skipDuplicates: true,
    });
  }
  return seeded;
}

export async function listPeriodStaffForStore(
  storeId: string,
  periodKey: string
): Promise<PeriodStaffRecord[]> {
  const { staff, settingsByStaffId } = await loadStaffSettingsForPeriod(
    storeId,
    periodKey
  );
  return staff.map((person) => ({
    staffId: person.id,
    primaryNickname: person.primaryNickname,
    legalName: person.legalName,
    kind: person.kind === "GUEST" ? "guest" : "regular",
    laborHealthInsuranceCarryOverMonthly:
      person.laborHealthInsuranceCarryOverMonthly,
    settings: settingsForStaff(person.id, settingsByStaffId),
  }));
}

export async function loadPeriodStaffInputs(
  storeId: string,
  periodKey: string
): Promise<PeriodStaffInput[]> {
  const { staff, settingsByStaffId } = await loadStaffSettingsForPeriod(
    storeId,
    periodKey
  );
  return staff.map((person) => ({
    primaryNickname: person.primaryNickname,
    ...settingsForStaff(person.id, settingsByStaffId),
  }));
}

export async function upsertPeriodStaffSetting(input: {
  actorRole: AccountRole;
  storeId: string;
  periodKey: string;
  staffId: string;
  settings: PeriodStaffSettingsJson;
}): Promise<PeriodStaffRecord> {
  requireAdmin(input.actorRole);
  await assertPayPeriodUnlockedForWrite(input.storeId, input.periodKey);
  const staff = await prisma.staff.findUnique({ where: { id: input.staffId } });
  if (!staff || staff.storeId !== input.storeId) {
    throw new Error("店員不存在");
  }
  const payPeriodId = await ensurePayPeriodId(input.storeId, input.periodKey);
  const row = await prisma.payPeriodStaffSetting.upsert({
    where: {
      payPeriodId_staffId: { payPeriodId, staffId: input.staffId },
    },
    create: {
      payPeriodId,
      staffId: input.staffId,
      settingsJson: input.settings,
    },
    update: { settingsJson: input.settings },
  });
  return {
    staffId: staff.id,
    primaryNickname: staff.primaryNickname,
    legalName: staff.legalName,
    kind: staff.kind === "GUEST" ? "guest" : "regular",
    laborHealthInsuranceCarryOverMonthly:
      staff.laborHealthInsuranceCarryOverMonthly,
    settings: parseSettingsJson(row.settingsJson),
  };
}
