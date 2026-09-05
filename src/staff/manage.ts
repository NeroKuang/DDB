import type { AccountRole, PayKind, StaffKind } from "@prisma/client";
import {
  adminResetPassword,
  createAccount,
  type PublicUser,
} from "@/auth/accounts";
import { prisma } from "@/lib/prisma";
import { parseLaborHealthMode } from "@/lib/labor-health-insurance";
import { roundMoney } from "@/lib/money";
import {
  assertJulyPayPeriodUnlocked,
  assertPayPeriodUnlockedForWrite,
} from "@/pay-period/guards";
import {
  defaultLoginUsernameFromPhone,
  defaultPasswordFromContactPhone,
} from "@/staff/phone-auth";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

export type StaffRecord = {
  id: string;
  storeId: string;
  legalName: string;
  primaryNickname: string;
  contactPhone: string;
  aliases: string[];
  title: string;
  kind: "regular" | "guest";
  guestPeriodKey: string | null;
  payKind: "hourly" | "monthly";
  hourlyRate: number;
  monthlyPay: number;
  commissionRate: number;
  targetBonusAmount: number;
  laborHealthInsuranceAmount: number;
  laborHealthInsuranceMode: "fixed" | "ratio";
  laborHealthInsuranceRatio: number;
  laborHealthInsuranceCarryOverMonthly: boolean;
  payNote: string;
  personalAccount: { id: string; username: string } | null;
};

export type StaffWriteInput = {
  legalName: string;
  primaryNickname: string;
  contactPhone: string;
  aliases: string[];
  title: string;
  kind: "regular" | "guest";
  guestPeriodKey: string | null;
  payKind: "hourly" | "monthly";
  hourlyRate: number;
  monthlyPay: number;
  commissionRate: number;
  targetBonusAmount: number;
  laborHealthInsuranceAmount: number;
  laborHealthInsuranceMode: "fixed" | "ratio";
  laborHealthInsuranceRatio: number;
  laborHealthInsuranceCarryOverMonthly: boolean;
  payNote: string;
};

function normalizeGuestPeriodKey(input: StaffWriteInput): string | null {
  const raw = input.guestPeriodKey?.trim() ?? "";
  if (input.kind === "guest") {
    if (!raw) {
      throw new Error("客座須指定薪資期間（如 2026-07）。");
    }
    return raw;
  }
  return null;
}

function requireAdmin(actorRole: AccountRole): void {
  if (actorRole !== "ADMIN") {
    throw new Error("Only Admin can change 店員主檔");
  }
}

function toDbKind(kind: StaffWriteInput["kind"]): StaffKind {
  return kind === "guest" ? "GUEST" : "REGULAR";
}

function toDbPayKind(kind: StaffWriteInput["payKind"]): PayKind {
  return kind === "monthly" ? "MONTHLY" : "HOURLY";
}

function toDbLaborMode(mode: StaffWriteInput["laborHealthInsuranceMode"]) {
  return mode === "ratio" ? "RATIO" : "FIXED";
}

function fromDbLaborMode(
  mode: "FIXED" | "RATIO"
): StaffRecord["laborHealthInsuranceMode"] {
  return mode === "RATIO" ? "ratio" : "fixed";
}

function mapStaff(row: {
  id: string;
  storeId: string;
  legalName: string;
  primaryNickname: string;
  contactPhone: string;
  title: string;
  kind: StaffKind;
  payKind: PayKind;
  hourlyRate: number;
  monthlyPay: number;
  commissionRate: number;
  targetBonusAmount: number;
  laborHealthInsuranceAmount: number;
  laborHealthInsuranceMode: "FIXED" | "RATIO";
  laborHealthInsuranceRatio: number;
  laborHealthInsuranceCarryOverMonthly: boolean;
  payNote: string;
  guestPeriodKey: string | null;
  aliases: { nickname: string }[];
  users: { id: string; username: string; role: string }[];
}): StaffRecord {
  const personal = row.users.find((user) => user.role === "PERSONAL");
  return {
    id: row.id,
    storeId: row.storeId,
    legalName: row.legalName,
    primaryNickname: row.primaryNickname,
    contactPhone: row.contactPhone,
    aliases: row.aliases.map((alias) => alias.nickname),
    title: row.title,
    kind: row.kind === "GUEST" ? "guest" : "regular",
    guestPeriodKey: row.guestPeriodKey,
    payKind: row.payKind === "MONTHLY" ? "monthly" : "hourly",
    hourlyRate: row.hourlyRate,
    monthlyPay: row.monthlyPay,
    commissionRate: row.commissionRate,
    targetBonusAmount: row.targetBonusAmount,
    laborHealthInsuranceAmount: row.laborHealthInsuranceAmount,
    laborHealthInsuranceMode: fromDbLaborMode(row.laborHealthInsuranceMode),
    laborHealthInsuranceRatio: row.laborHealthInsuranceRatio,
    laborHealthInsuranceCarryOverMonthly:
      row.laborHealthInsuranceCarryOverMonthly,
    payNote: row.payNote,
    personalAccount: personal
      ? { id: personal.id, username: personal.username }
      : null,
  };
}

const staffInclude = {
  aliases: true,
  users: { where: { role: "PERSONAL" as const } },
} as const;

export function parseAliasesField(raw: string): string[] {
  const parts = raw
    .split(/[,，、\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
  return [...new Set(parts)];
}

async function assertStaffWriteAllowed(
  storeId: string,
  data: StaffWriteInput
): Promise<void> {
  if (data.kind === "guest" && data.guestPeriodKey) {
    await assertPayPeriodUnlockedForWrite(storeId, data.guestPeriodKey);
    return;
  }
  await assertJulyPayPeriodUnlocked(storeId);
}

function normalizeStaffInput(input: StaffWriteInput): StaffWriteInput {
  const primaryNickname = input.primaryNickname.trim();
  if (!primaryNickname) {
    throw new Error("主暱稱不可空白");
  }
  if (input.commissionRate < 0 || input.commissionRate > 1) {
    throw new Error("業績成數須在 0～1 之間");
  }
  if (
    input.laborHealthInsuranceRatio < 0 ||
    input.laborHealthInsuranceRatio > 1
  ) {
    throw new Error("勞健保比例須在 0～1 之間");
  }
  const guestPeriodKey = normalizeGuestPeriodKey(input);
  return {
    ...input,
    laborHealthInsuranceMode: parseLaborHealthMode(
      String(input.laborHealthInsuranceMode)
    ),
    legalName: input.legalName.trim(),
    primaryNickname,
    contactPhone: input.contactPhone.trim(),
    title: input.title.trim(),
    payNote: input.payNote.trim(),
    guestPeriodKey,
    aliases: [
      ...new Set(input.aliases.map((alias) => alias.trim()).filter(Boolean)),
    ],
    hourlyRate: roundMoney(input.hourlyRate),
    monthlyPay: roundMoney(input.monthlyPay),
    targetBonusAmount: roundMoney(input.targetBonusAmount),
    laborHealthInsuranceAmount: roundMoney(input.laborHealthInsuranceAmount),
    laborHealthInsuranceRatio: input.laborHealthInsuranceRatio,
    commissionRate: input.commissionRate,
  };
}

async function replaceAliases(
  staffId: string,
  aliases: string[]
): Promise<void> {
  await prisma.staffAlias.deleteMany({ where: { staffId } });
  if (aliases.length > 0) {
    await prisma.staffAlias.createMany({
      data: aliases.map((nickname) => ({ staffId, nickname })),
    });
  }
}

export async function listStaffForStore(
  storeId: string
): Promise<StaffRecord[]> {
  const rows = await prisma.staff.findMany({
    where: { storeId },
    include: staffInclude,
    orderBy: { primaryNickname: "asc" },
  });
  return rows.map(mapStaff);
}

export async function listStaffForStoreCode(
  storeCode = ZHONGSHAN_STORE_CODE
): Promise<StaffRecord[]> {
  const store = await prisma.store.findUnique({ where: { code: storeCode } });
  if (!store) {
    return [];
  }
  return listStaffForStore(store.id);
}

export async function getStaffById(id: string): Promise<StaffRecord | null> {
  const row = await prisma.staff.findUnique({
    where: { id },
    include: staffInclude,
  });
  return row ? mapStaff(row) : null;
}

export async function createStaff(input: {
  actorRole: AccountRole;
  storeId: string;
  data: StaffWriteInput;
}): Promise<StaffRecord> {
  requireAdmin(input.actorRole);
  const data = normalizeStaffInput(input.data);
  await assertStaffWriteAllowed(input.storeId, data);
  const row = await prisma.staff.create({
    data: {
      storeId: input.storeId,
      legalName: data.legalName,
      primaryNickname: data.primaryNickname,
      contactPhone: data.contactPhone,
      title: data.title,
      kind: toDbKind(data.kind),
      payKind: toDbPayKind(data.payKind),
      hourlyRate: data.hourlyRate,
      monthlyPay: data.monthlyPay,
      commissionRate: data.commissionRate,
      targetBonusAmount: data.targetBonusAmount,
      laborHealthInsuranceAmount: data.laborHealthInsuranceAmount,
      laborHealthInsuranceMode: toDbLaborMode(data.laborHealthInsuranceMode),
      laborHealthInsuranceRatio: data.laborHealthInsuranceRatio,
      laborHealthInsuranceCarryOverMonthly:
        data.laborHealthInsuranceCarryOverMonthly,
      payNote: data.payNote,
      guestPeriodKey: data.guestPeriodKey,
    },
    include: staffInclude,
  });
  await replaceAliases(row.id, data.aliases);
  const refreshed = await getStaffById(row.id);
  if (!refreshed) {
    throw new Error("店員建立失敗");
  }
  return refreshed;
}

export async function updateStaff(input: {
  actorRole: AccountRole;
  id: string;
  data: StaffWriteInput;
}): Promise<StaffRecord> {
  requireAdmin(input.actorRole);
  const data = normalizeStaffInput(input.data);
  const existing = await prisma.staff.findUnique({ where: { id: input.id } });
  if (!existing) {
    throw new Error("店員不存在");
  }
  await assertStaffWriteAllowed(existing.storeId, data);
  await prisma.staff.update({
    where: { id: input.id },
    data: {
      legalName: data.legalName,
      primaryNickname: data.primaryNickname,
      contactPhone: data.contactPhone,
      title: data.title,
      kind: toDbKind(data.kind),
      payKind: toDbPayKind(data.payKind),
      hourlyRate: data.hourlyRate,
      monthlyPay: data.monthlyPay,
      commissionRate: data.commissionRate,
      targetBonusAmount: data.targetBonusAmount,
      laborHealthInsuranceAmount: data.laborHealthInsuranceAmount,
      laborHealthInsuranceMode: toDbLaborMode(data.laborHealthInsuranceMode),
      laborHealthInsuranceRatio: data.laborHealthInsuranceRatio,
      laborHealthInsuranceCarryOverMonthly:
        data.laborHealthInsuranceCarryOverMonthly,
      payNote: data.payNote,
      guestPeriodKey: data.guestPeriodKey,
    },
  });
  await replaceAliases(input.id, data.aliases);
  const refreshed = await getStaffById(input.id);
  if (!refreshed) {
    throw new Error("店員更新失敗");
  }
  return refreshed;
}

export async function openPersonalAccountForStaff(input: {
  actorRole: AccountRole;
  staffId: string;
  username?: string;
}): Promise<PublicUser> {
  requireAdmin(input.actorRole);
  const staff = await prisma.staff.findUnique({
    where: { id: input.staffId },
    include: { users: { where: { role: "PERSONAL" } } },
  });
  if (!staff) {
    throw new Error("店員不存在");
  }
  if (staff.kind === "GUEST") {
    throw new Error("客座不可開 personal 帳號");
  }
  if (staff.users.length > 0) {
    throw new Error("此店員已有 personal 帳號");
  }
  const username =
    input.username?.trim() || defaultLoginUsernameFromPhone(staff.contactPhone);
  const password = defaultPasswordFromContactPhone(staff.contactPhone);
  return createAccount({
    actorRole: "ADMIN",
    username,
    password,
    role: "PERSONAL",
    staffId: staff.id,
  });
}

export async function resetPersonalAccountPassword(input: {
  actorRole: AccountRole;
  staffId: string;
}): Promise<void> {
  requireAdmin(input.actorRole);
  const staff = await prisma.staff.findUnique({
    where: { id: input.staffId },
    include: { users: { where: { role: "PERSONAL" } } },
  });
  if (!staff) {
    throw new Error("店員不存在");
  }
  const account = staff.users[0];
  if (!account) {
    throw new Error("此店員尚未開 personal 帳號");
  }
  const password = defaultPasswordFromContactPhone(staff.contactPhone);
  await adminResetPassword({
    actorRole: "ADMIN",
    username: account.username,
    newPassword: password,
  });
}

export async function updatePersonalAccountUsername(input: {
  actorRole: AccountRole;
  staffId: string;
  username: string;
}): Promise<PublicUser> {
  requireAdmin(input.actorRole);
  const username = input.username.trim();
  if (!username) {
    throw new Error("登入名稱不可空白");
  }
  const staff = await prisma.staff.findUnique({
    where: { id: input.staffId },
    include: {
      users: { where: { role: "PERSONAL" }, include: { staff: true } },
    },
  });
  if (!staff) {
    throw new Error("店員不存在");
  }
  const account = staff.users[0];
  if (!account) {
    throw new Error("此店員尚未開 personal 帳號");
  }
  const user = await prisma.user.update({
    where: { id: account.id },
    data: { username },
    include: { staff: true },
  });
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    staffId: user.staffId,
    primaryNickname: user.staff?.primaryNickname ?? null,
  };
}
