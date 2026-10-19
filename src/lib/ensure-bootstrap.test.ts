import { describe, expect, it } from "vitest";
import {
  ensureAppBootstrap,
  resetAppBootstrapForTests,
} from "@/lib/ensure-bootstrap";
import { prisma } from "@/lib/prisma";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

describe("ensureAppBootstrap once per process", () => {
  it("second call does not re-run staff create loop (staff count stable)", async () => {
    resetAppBootstrapForTests();
    await ensureAppBootstrap();
    const store = await prisma.store.findUniqueOrThrow({
      where: { code: ZHONGSHAN_STORE_CODE },
    });
    const firstCount = await prisma.staff.count({
      where: { storeId: store.id },
    });
    expect(firstCount).toBeGreaterThan(0);

    await ensureAppBootstrap();
    const secondCount = await prisma.staff.count({
      where: { storeId: store.id },
    });
    expect(secondCount).toBe(firstCount);
  });
});
