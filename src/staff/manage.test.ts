import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { verifyCredentials } from "@/auth/accounts";
import { prisma } from "@/lib/prisma";
import { clearJulyPayPeriodLock } from "@/test-utils/clear-july-pay-period-lock";
import {
  createStaff,
  getStaffById,
  openPersonalAccountForStaff,
  resetPersonalAccountPassword,
  updateStaff,
} from "@/staff/manage";
import { seedZhongshanStoreAndStaff } from "@/staff/seed-zhongshan";

const NICK = `測試員_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

describe("staff master CRUD", () => {
  let storeId = "";

  beforeAll(async () => {
    const seeded = await seedZhongshanStoreAndStaff();
    storeId = seeded.storeId;
  });

  beforeEach(async () => {
    await clearJulyPayPeriodLock(storeId);
  });

  afterAll(async () => {
    const staff = await prisma.staff.findFirst({
      where: { storeId, primaryNickname: NICK },
      include: { users: true },
    });
    if (staff) {
      await prisma.user.deleteMany({ where: { staffId: staff.id } });
      await prisma.staff.delete({ where: { id: staff.id } });
    }
    await prisma.$disconnect();
  });

  it("lets Admin create and update 店員 with aliases", async () => {
    const created = await createStaff({
      actorRole: "ADMIN",
      storeId,
      data: {
        legalName: "測試本名",
        primaryNickname: NICK,
        contactPhone: "0912-000-1234",
        aliases: ["別名A", "別名B"],
        title: "測試",
        kind: "regular",
        payKind: "hourly",
        hourlyRate: 230,
        monthlyPay: 0,
        commissionRate: 0.2,
        targetBonusAmount: 8000,
        laborHealthInsuranceAmount: 2100,
        payNote: "",
      },
    });
    expect(created.aliases).toEqual(["別名A", "別名B"]);

    const updated = await updateStaff({
      actorRole: "ADMIN",
      id: created.id,
      data: {
        legalName: created.legalName,
        primaryNickname: created.primaryNickname,
        contactPhone: created.contactPhone,
        aliases: ["別名C"],
        title: created.title,
        kind: created.kind,
        payKind: created.payKind,
        hourlyRate: 250,
        monthlyPay: created.monthlyPay,
        commissionRate: created.commissionRate,
        targetBonusAmount: created.targetBonusAmount,
        laborHealthInsuranceAmount: created.laborHealthInsuranceAmount,
        payNote: created.payNote,
      },
    });
    expect(updated.hourlyRate).toBe(250);
    expect(updated.aliases).toEqual(["別名C"]);
  });

  it("opens personal with phone login and last-four password", async () => {
    const staff = await prisma.staff.findFirstOrThrow({
      where: { storeId, primaryNickname: NICK },
    });
    const account = await openPersonalAccountForStaff({
      actorRole: "ADMIN",
      staffId: staff.id,
    });
    expect(account.username).toBe("09120001234");
    const login = await verifyCredentials("09120001234", "1234");
    expect(login?.primaryNickname).toBe(NICK);

    await resetPersonalAccountPassword({
      actorRole: "ADMIN",
      staffId: staff.id,
    });
    expect(await verifyCredentials("09120001234", "1234")).toBeTruthy();
  });

  it("rejects duplicate personal account", async () => {
    const staff = await getStaffById(
      (
        await prisma.staff.findFirstOrThrow({
          where: { storeId, primaryNickname: NICK },
        })
      ).id
    );
    expect(staff?.personalAccount).toBeTruthy();
    await expect(
      openPersonalAccountForStaff({
        actorRole: "ADMIN",
        staffId: staff!.id,
      })
    ).rejects.toThrow(/已有 personal/);
  });
});
