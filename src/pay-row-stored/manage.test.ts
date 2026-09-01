import { describe, expect, it } from "vitest";
import { compilePayPeriod } from "@/compile/compile-pay-period";
import { zhongshanJuly2026Shop } from "@/compile/zhongshan-july-2026-shop";
import { JULY_2026_PERIOD_KEY } from "@/ad-hoc-tasks/manage";
import {
  loadSavedStoredMap,
  upsertPayRowStored,
} from "@/pay-row-stored/manage";
import { seedZhongshanStoreAndStaff } from "@/staff/seed-zhongshan";
import { prisma } from "@/lib/prisma";

describe("pay-row-stored", () => {
  it("persists overrides and applies them on compile", async () => {
    const { storeId } = await seedZhongshanStoreAndStaff();
    const staff = await prisma.staff.findFirstOrThrow({
      where: { storeId, primaryNickname: "粉冥" },
    });
    await upsertPayRowStored({
      actorRole: "ADMIN",
      storeId,
      periodKey: JULY_2026_PERIOD_KEY,
      staffId: staff.id,
      venue: "frontOfHouse",
      values: { commission: 999 },
    });
    const saved = await loadSavedStoredMap(storeId, JULY_2026_PERIOD_KEY);
    const result = compilePayPeriod({
      shop: zhongshanJuly2026Shop(),
      checkoutLines: [],
      punchPairs: [],
      noteClicks: [],
      noteOuterComplete: true,
      savedStored: saved,
    });
    const row = result.payRows.find((item) => item.primaryNickname === "粉冥");
    expect(row?.stored.commission).toBe(999);
  });
});
