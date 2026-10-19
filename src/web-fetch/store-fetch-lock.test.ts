import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedZhongshanStoreAndStaff } from "@/staff/seed-zhongshan";
import {
  acquireStoreFetchLock,
  releaseStoreFetchLock,
  STORE_FETCH_LOCK_STALE_MS,
} from "@/web-fetch/store-fetch-lock";

describe("store fetch lock", () => {
  it("allows only one concurrent acquire", async () => {
    const seeded = await seedZhongshanStoreAndStaff();
    await prisma.store.update({
      where: { id: seeded.storeId },
      data: { fetchLockToken: null, fetchLockAcquiredAt: null },
    });

    const first = await acquireStoreFetchLock(seeded.storeId);
    const second = await acquireStoreFetchLock(seeded.storeId);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (first.ok) {
      await releaseStoreFetchLock(seeded.storeId, first.token);
    }
    const third = await acquireStoreFetchLock(seeded.storeId);
    expect(third.ok).toBe(true);
    if (third.ok) {
      await releaseStoreFetchLock(seeded.storeId, third.token);
    }
  });

  it("clears stale locks then allows acquire", async () => {
    const seeded = await seedZhongshanStoreAndStaff();
    const staleAt = new Date(Date.now() - STORE_FETCH_LOCK_STALE_MS - 1000);
    await prisma.store.update({
      where: { id: seeded.storeId },
      data: {
        fetchLockToken: "stale-token",
        fetchLockAcquiredAt: staleAt,
      },
    });

    const acquired = await acquireStoreFetchLock(seeded.storeId);
    expect(acquired.ok).toBe(true);
    if (acquired.ok) {
      await releaseStoreFetchLock(seeded.storeId, acquired.token);
    }
  });
});
