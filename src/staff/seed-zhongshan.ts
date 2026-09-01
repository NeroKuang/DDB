import { prisma } from "@/lib/prisma";
import { zhongshanJuly2026Shop } from "@/compile/zhongshan-july-2026-shop";
import type { StaffMaster } from "@/compile/types";

export const ZHONGSHAN_STORE_CODE = "zhongshan";

function toDbKind(kind: StaffMaster["kind"]): "REGULAR" | "GUEST" {
  return kind === "guest" ? "GUEST" : "REGULAR";
}

function toDbPayKind(kind: StaffMaster["payKind"]): "HOURLY" | "MONTHLY" {
  return kind === "monthly" ? "MONTHLY" : "HOURLY";
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

  return {
    storeId: store.id,
    staffCount: shop.staff.length,
  };
}

export async function loadStaffMastersForStore(
  storeCode = ZHONGSHAN_STORE_CODE
): Promise<StaffMaster[]> {
  const store = await prisma.store.findUnique({
    where: { code: storeCode },
    include: { staff: { include: { aliases: true } } },
  });
  if (!store) {
    return zhongshanJuly2026Shop().staff;
  }
  return store.staff.map((row) => ({
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
    payNote: row.payNote,
  }));
}
