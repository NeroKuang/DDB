import { prisma } from "@/lib/prisma";
import { DEFAULT_COMMISSION_RATE } from "@/lib/commission-rate";
import { JULY_2026_PERIOD_KEY } from "@/lib/period-keys";
import { zhongshanJuly2026Shop } from "@/compile/zhongshan-july-2026-shop";
import type { StaffMaster } from "@/compile/types";
import { staffIncludedInPayPeriod } from "@/staff/guest-period";

export const ZHONGSHAN_STORE_CODE = "zhongshan";

function toDbKind(kind: StaffMaster["kind"]): "REGULAR" | "GUEST" {
  return kind === "guest" ? "GUEST" : "REGULAR";
}

function toDbPayKind(kind: StaffMaster["payKind"]): "HOURLY" | "MONTHLY" {
  return kind === "monthly" ? "MONTHLY" : "HOURLY";
}

function guestPeriodKeyForSeed(person: StaffMaster): string | null {
  return person.kind === "guest" ? JULY_2026_PERIOD_KEY : null;
}

export async function seedZhongshanStoreAndStaff(): Promise<{
  storeId: string;
  staffCount: number;
}> {
  const shop = zhongshanJuly2026Shop();
  const store = await prisma.store.upsert({
    where: { code: ZHONGSHAN_STORE_CODE },
    create: { code: ZHONGSHAN_STORE_CODE, name: "中山" },
    update: { name: "中山" },
  });

  for (const person of shop.staff) {
    const staff = await prisma.staff.upsert({
      where: {
        storeId_primaryNickname: {
          storeId: store.id,
          primaryNickname: person.primaryNickname,
        },
      },
      create: {
        storeId: store.id,
        legalName: person.legalName,
        primaryNickname: person.primaryNickname,
        title: person.title,
        kind: toDbKind(person.kind),
        payKind: toDbPayKind(person.payKind),
        hourlyRate: person.hourlyRate,
        monthlyPay: person.monthlyPay,
        commissionRate: person.commissionRate,
        targetBonusAmount: person.targetBonusAmount,
        laborHealthInsuranceAmount: person.laborHealthInsuranceAmount,
        payNote: person.payNote,
        guestPeriodKey: guestPeriodKeyForSeed(person),
      },
      update: {
        legalName: person.legalName,
        title: person.title,
        kind: toDbKind(person.kind),
        payKind: toDbPayKind(person.payKind),
        hourlyRate: person.hourlyRate,
        monthlyPay: person.monthlyPay,
        commissionRate: person.commissionRate,
        targetBonusAmount: person.targetBonusAmount,
        laborHealthInsuranceAmount: person.laborHealthInsuranceAmount,
        payNote: person.payNote,
        guestPeriodKey: guestPeriodKeyForSeed(person),
      },
    });
    if (person.aliases.length > 0) {
      await prisma.staffAlias.createMany({
        data: person.aliases.map((nickname) => ({
          staffId: staff.id,
          nickname,
        })),
        skipDuplicates: true,
      });
    }
  }

  await prisma.staff.updateMany({
    where: { storeId: store.id, commissionRate: 0 },
    data: { commissionRate: DEFAULT_COMMISSION_RATE },
  });

  return {
    storeId: store.id,
    staffCount: shop.staff.length,
  };
}

function mapStaffRow(row: {
  legalName: string;
  primaryNickname: string;
  title: string;
  kind: "REGULAR" | "GUEST";
  payKind: "HOURLY" | "MONTHLY";
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
}): StaffMaster {
  return {
    legalName: row.legalName,
    primaryNickname: row.primaryNickname,
    aliases: row.aliases.map((alias) => alias.nickname),
    title: row.title,
    kind: row.kind === "GUEST" ? "guest" : "regular",
    payKind: row.payKind === "MONTHLY" ? "monthly" : "hourly",
    hourlyRate: row.hourlyRate,
    monthlyPay: row.monthlyPay,
    commissionRate: row.commissionRate,
    targetBonusAmount: row.targetBonusAmount,
    laborHealthInsuranceAmount: row.laborHealthInsuranceAmount,
    laborHealthInsuranceMode:
      row.laborHealthInsuranceMode === "RATIO" ? "ratio" : "fixed",
    laborHealthInsuranceRatio: row.laborHealthInsuranceRatio,
    laborHealthInsuranceCarryOverMonthly:
      row.laborHealthInsuranceCarryOverMonthly,
    payNote: row.payNote,
  };
}

/** Staff roster for one 薪資期間 compile (regular always; guest only when assigned). */
export async function loadStaffMastersForPeriod(
  periodKey: string,
  storeCode = ZHONGSHAN_STORE_CODE
): Promise<StaffMaster[]> {
  const store = await prisma.store.findUnique({
    where: { code: storeCode },
    include: { staff: { include: { aliases: true } } },
  });
  if (!store) {
    return zhongshanJuly2026Shop().staff.filter((person) =>
      staffIncludedInPayPeriod({
        kind: person.kind,
        guestPeriodKey: person.kind === "guest" ? JULY_2026_PERIOD_KEY : null,
        periodKey,
      })
    );
  }
  return store.staff
    .filter((row) =>
      staffIncludedInPayPeriod({
        kind: row.kind === "GUEST" ? "guest" : "regular",
        guestPeriodKey: row.guestPeriodKey,
        periodKey,
      })
    )
    .map(mapStaffRow);
}

/** @deprecated Use loadStaffMastersForPeriod(periodKey). */
export async function loadStaffMastersForStore(
  storeCode = ZHONGSHAN_STORE_CODE
): Promise<StaffMaster[]> {
  return loadStaffMastersForPeriod(JULY_2026_PERIOD_KEY, storeCode);
}
