import type { AccountRole } from "@prisma/client";
import { zhongshanJuly2026Shop } from "@/compile/zhongshan-july-2026-shop";
import type { PeriodStaffInput } from "@/compile/types";
import { JULY_2026_PERIOD_KEY } from "@/ad-hoc-tasks/manage";
import { prisma } from "@/lib/prisma";
import { assertJulyPayPeriodUnlocked } from "@/pay-period/guards";
import {
  DEFAULT_PERIOD_STAFF_SETTINGS,
  type PeriodStaffSettingsJson,
} from "@/pay-period-staff/types";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

export type PeriodStaffRecord = {
  staffId: string;
  primaryNickname: string;
  legalName: string;
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

async function ensureJulyPayPeriod(storeId: string): Promise<string> {
  const row = await prisma.payPeriod.upsert({
    where: {
      storeId_periodKey: { storeId, periodKey: JULY_2026_PERIOD_KEY },
    },
    create: { storeId, periodKey: JULY_2026_PERIOD_KEY },
    update: {},
  });
  return row.id;
}

export async function seedJulyPeriodStaffFromFixture(
  storeCode = ZHONGSHAN_STORE_CODE
): Promise<number> {
  const store = await prisma.store.findUnique({ where: { code: storeCode } });
  if (!store) {
    return 0;
  }
  const payPeriodId = await ensureJulyPayPeriod(store.id);
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
  for (const input of fixture) {
    const staffId = byNickname.get(input.primaryNickname);
    if (!staffId) {
      continue;
    }
    const { primaryNickname: _drop, ...settings } = input;
    await prisma.payPeriodStaffSetting.create({
      data: {
        payPeriodId,
        staffId,
        settingsJson: settings,
      },
    });
    seeded += 1;
  }
  return seeded;
}

export async function listPeriodStaffForStore(
  storeId: string,
  periodKey: string
): Promise<PeriodStaffRecord[]> {
  const payPeriod = await prisma.payPeriod.findUnique({
    where: { storeId_periodKey: { storeId, periodKey } },
  });
  const staff = await prisma.staff.findMany({
    where: { storeId },
    orderBy: { primaryNickname: "asc" },
  });
  const settingsByStaffId = new Map<string, PeriodStaffSettingsJson>();
  if (payPeriod) {
    const rows = await prisma.payPeriodStaffSetting.findMany({
      where: { payPeriodId: payPeriod.id },
    });
    for (const row of rows) {
      settingsByStaffId.set(row.staffId, parseSettingsJson(row.settingsJson));
    }
  }
  return staff.map((person) => ({
    staffId: person.id,
    primaryNickname: person.primaryNickname,
    legalName: person.legalName,
    settings: settingsByStaffId.get(person.id) ?? {
      ...DEFAULT_PERIOD_STAFF_SETTINGS,
    },
  }));
}

export async function loadPeriodStaffInputs(
  storeId: string,
  periodKey: string
): Promise<PeriodStaffInput[]> {
  const payPeriod = await prisma.payPeriod.findUnique({
    where: { storeId_periodKey: { storeId, periodKey } },
  });
  if (!payPeriod) {
    return zhongshanJuly2026Shop().periodStaff;
  }
  const settingsRows = await prisma.payPeriodStaffSetting.findMany({
    where: { payPeriodId: payPeriod.id },
  });
  if (settingsRows.length === 0) {
    return zhongshanJuly2026Shop().periodStaff;
  }
  const staff = await prisma.staff.findMany({
    where: { storeId },
    orderBy: { primaryNickname: "asc" },
  });
  const byStaffId = new Map(
    settingsRows.map((row) => [
      row.staffId,
      parseSettingsJson(row.settingsJson),
    ])
  );
  return staff.map((person) => ({
    primaryNickname: person.primaryNickname,
    ...(byStaffId.get(person.id) ?? { ...DEFAULT_PERIOD_STAFF_SETTINGS }),
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
  await assertJulyPayPeriodUnlocked(input.storeId);
  const staff = await prisma.staff.findUnique({ where: { id: input.staffId } });
  if (!staff || staff.storeId !== input.storeId) {
    throw new Error("店員不存在");
  }
  const payPeriodId = await ensureJulyPayPeriod(input.storeId);
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
    settings: parseSettingsJson(row.settingsJson),
  };
}
