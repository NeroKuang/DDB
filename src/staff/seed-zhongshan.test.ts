import { applyDotEnvFile } from "@/fetch/ichef-web-fetch";
import { prisma } from "@/lib/prisma";
import {
  seedZhongshanStoreAndStaff,
  ZHONGSHAN_STORE_CODE,
} from "@/staff/seed-zhongshan";

applyDotEnvFile();

describe("seedZhongshanStoreAndStaff", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("upserts 中山門市 and July 店員 master rows", async () => {
    const result = await seedZhongshanStoreAndStaff();
    expect(result.staffCount).toBeGreaterThan(20);
    const store = await prisma.store.findUnique({
      where: { code: ZHONGSHAN_STORE_CODE },
      include: {
        staff: {
          where: { primaryNickname: "黑夢" },
          include: { aliases: true },
        },
      },
    });
    expect(store?.name).toBe("中山");
    expect(store?.staff[0]?.aliases.some((a) => a.nickname === "黒夢")).toBe(
      true
    );
  });

  it("does not overwrite Admin payKind on re-seed (bootstrap)", async () => {
    await seedZhongshanStoreAndStaff();
    const store = await prisma.store.findUniqueOrThrow({
      where: { code: ZHONGSHAN_STORE_CODE },
    });
    const xiamian = await prisma.staff.findFirstOrThrow({
      where: { storeId: store.id, primaryNickname: "夏眠" },
    });
    await prisma.staff.update({
      where: { id: xiamian.id },
      data: { payKind: "MONTHLY", monthlyPay: 42000, hourlyRate: 0 },
    });
    await seedZhongshanStoreAndStaff();
    const after = await prisma.staff.findUniqueOrThrow({
      where: { id: xiamian.id },
    });
    expect(after.payKind).toBe("MONTHLY");
    expect(after.monthlyPay).toBe(42000);
  });
});
