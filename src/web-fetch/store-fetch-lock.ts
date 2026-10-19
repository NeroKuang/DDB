import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

/** Stale lock age (month fetch with note drill-downs can run long). */
export const STORE_FETCH_LOCK_STALE_MS = 90 * 60 * 1000;

export type AcquireStoreFetchLockResult =
  { ok: true; token: string } | { ok: false; reason: "busy" };

/**
 * Atomically acquire the store-level 網頁取數 lock (month and business-day share it).
 * Releases stale locks older than STORE_FETCH_LOCK_STALE_MS before trying.
 */
export async function acquireStoreFetchLock(
  storeId: string
): Promise<AcquireStoreFetchLockResult> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STORE_FETCH_LOCK_STALE_MS);

  await prisma.store.updateMany({
    where: {
      id: storeId,
      fetchLockToken: { not: null },
      fetchLockAcquiredAt: { lt: staleBefore },
    },
    data: {
      fetchLockToken: null,
      fetchLockAcquiredAt: null,
    },
  });

  const token = randomUUID();
  const acquired = await prisma.store.updateMany({
    where: {
      id: storeId,
      fetchLockToken: null,
    },
    data: {
      fetchLockToken: token,
      fetchLockAcquiredAt: now,
    },
  });

  if (acquired.count !== 1) {
    return { ok: false, reason: "busy" };
  }
  return { ok: true, token };
}

export async function releaseStoreFetchLock(
  storeId: string,
  token: string
): Promise<void> {
  await prisma.store.updateMany({
    where: {
      id: storeId,
      fetchLockToken: token,
    },
    data: {
      fetchLockToken: null,
      fetchLockAcquiredAt: null,
    },
  });
}
