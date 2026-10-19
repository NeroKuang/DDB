/**
 * Live iCHEF daily fetch (checkout + punches only).
 * Run explicitly:
 *   dotenv -e .env -- vitest run src/range/daily-fetch-live.test.ts
 * Excluded from default `npm test`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  applyDotEnvFile,
  readIchefCredentialsFromEnv,
} from "@/fetch/ichef-web-fetch";
import { previousCompletedBusinessDate } from "@/range/daily-fetch-manage";
import {
  runRangeBackfillJobs,
  startRangeBackfill,
} from "@/range/daily-fetch-manage";
import { loadRangeView } from "@/range/load-range-view";
import { prisma } from "@/lib/prisma";
import { seedZhongshanStoreAndStaff } from "@/staff/seed-zhongshan";

applyDotEnvFile();

const hasCreds = Boolean(readIchefCredentialsFromEnv());

describe.runIf(hasCreds)("live daily fetch (iCHEF)", () => {
  let storeId = "";
  const businessDate = previousCompletedBusinessDate();

  beforeAll(async () => {
    const seeded = await seedZhongshanStoreAndStaff();
    storeId = seeded.storeId;
    await prisma.store.update({
      where: { id: storeId },
      data: { fetchLockToken: null, fetchLockAcquiredAt: null },
    });
  }, 30_000);

  afterAll(async () => {
    // Keep local grain for manual /range inspection; only clear lock.
    await prisma.store.update({
      where: { id: storeId },
      data: { fetchLockToken: null, fetchLockAcquiredAt: null },
    });
  });

  it(`fetches previous completed business day ${businessDate}`, async () => {
    const { queued } = await startRangeBackfill({
      actorRole: "ADMIN",
      storeId,
      startBusinessDate: businessDate,
      endBusinessDate: businessDate,
      force: true,
    });
    expect(queued).toContain(businessDate);
    await runRangeBackfillJobs(storeId, [businessDate]);

    const day = await prisma.businessDayImport.findUniqueOrThrow({
      where: {
        storeId_businessDate: { storeId, businessDate },
      },
    });
    expect(day.fetchStatus).toBe("SUCCEEDED");
    expect(day.fetchErrorMessage).toBeNull();
    expect(day.activeImportRunId).toBeTruthy();

    const view = await loadRangeView({
      storeId,
      startBusinessDate: businessDate,
      endBusinessDate: businessDate,
    });
    expect(view.complete).toBe(true);
    expect(view.coverage[0]?.status).toBe("ready");
  }, 180_000);
});

describe.runIf(!hasCreds)("live daily fetch skipped", () => {
  it("skips when iCHEF credentials missing", () => {
    expect(hasCreds).toBe(false);
  });
});
