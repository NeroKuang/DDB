import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  listStaffTitles,
  seedStaffTitlesFromFixture,
} from "@/staff-titles/manage";
import { seedZhongshanStoreAndStaff } from "@/staff/seed-zhongshan";

describe("staff-titles", () => {
  it("seeds preset labels once", async () => {
    const { storeId } = await seedZhongshanStoreAndStaff();
    await prisma.staffTitle.deleteMany({ where: { storeId } });
    const first = await seedStaffTitlesFromFixture();
    const second = await seedStaffTitlesFromFixture();
    expect(first).toBeGreaterThan(0);
    expect(second).toBe(0);
    const titles = await listStaffTitles(storeId);
    expect(titles).toContain("店長");
    expect(titles).toContain("排班");
  });
});
