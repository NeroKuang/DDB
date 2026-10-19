import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { julyFixturesAsFetched } from "@/import/ingest/july-fixture-bytes";
import { prisma } from "@/lib/prisma";
import { seedZhongshanStoreAndStaff } from "@/staff/seed-zhongshan";
import {
  runDailyFetchCatchUp,
  runRangeBackfillJobs,
  setDailyFetchRunnerForTests,
  startRangeBackfill,
} from "@/range/daily-fetch-manage";
import { loadRangeView } from "@/range/load-range-view";

describe("daily fetch + range view (local fixture)", () => {
  let storeId = "";
  const bizDate = "2026-07-15";

  beforeAll(async () => {
    const seeded = await seedZhongshanStoreAndStaff();
    storeId = seeded.storeId;
    await prisma.store.update({
      where: { id: storeId },
      data: { fetchLockToken: null, fetchLockAcquiredAt: null },
    });
    await prisma.businessDayImport.deleteMany({ where: { storeId } });
    await prisma.importRun.deleteMany({
      where: {
        payPeriod: { storeId },
        kind: "BUSINESS_DAY",
      },
    });
  });

  afterAll(async () => {
    setDailyFetchRunnerForTests(null);
    await prisma.businessDayImport.deleteMany({ where: { storeId } });
    await prisma.importRun.deleteMany({
      where: {
        payPeriod: { storeId },
        kind: "BUSINESS_DAY",
      },
    });
  });

  it("backfill one business day via fixture runner then range view is ready", async () => {
    const july = julyFixturesAsFetched();
    setDailyFetchRunnerForTests(async () => ({
      checkout: july.checkout,
      punches: july.punches,
    }));

    const { queued } = await startRangeBackfill({
      actorRole: "ADMIN",
      storeId,
      startBusinessDate: bizDate,
      endBusinessDate: bizDate,
    });
    expect(queued).toEqual([bizDate]);

    await runRangeBackfillJobs(storeId, queued);

    const day = await prisma.businessDayImport.findUniqueOrThrow({
      where: {
        storeId_businessDate: { storeId, businessDate: bizDate },
      },
    });
    expect(day.fetchStatus).toBe("SUCCEEDED");
    expect(day.activeImportRunId).toBeTruthy();

    const view = await loadRangeView({
      storeId,
      startBusinessDate: bizDate,
      endBusinessDate: bizDate,
    });
    expect(view.complete).toBe(true);
    expect(view.coverage[0]?.status).toBe("ready");
    // July fixture filtered to one noon-window may be sparse; status ready is the contract.
    expect(view.coverage).toHaveLength(1);
  });

  it("catch-up clears stale RUNNING and continues to next missing day", async () => {
    const staleDate = `2099-01-${String(10 + (randomUUID().charCodeAt(0) % 9)).padStart(2, "0")}`;
    const nextDate = (() => {
      const at = new Date(`${staleDate}T12:00:00+08:00`);
      at.setUTCDate(at.getUTCDate() + 1);
      return at.toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
    })();

    await prisma.businessDayImport.upsert({
      where: {
        storeId_businessDate: { storeId, businessDate: staleDate },
      },
      create: {
        storeId,
        businessDate: staleDate,
        fetchStatus: "RUNNING",
        fetchStartedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      update: {
        fetchStatus: "RUNNING",
        fetchStartedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        activeImportRunId: null,
      },
    });

    const july = julyFixturesAsFetched();
    const fetchedDates: string[] = [];
    setDailyFetchRunnerForTests(async (_creds, range) => {
      fetchedDates.push(range.startDate);
      return { checkout: july.checkout, punches: july.punches };
    });

    // Anchor catch-up window to include staleDate..nextDate as "last 2 days"
    const result = await runDailyFetchCatchUp({
      storeId,
      lookbackDays: 2,
      now: new Date(`${nextDate}T18:00:00+08:00`),
    });

    expect(result.skippedReason).toBeUndefined();
    expect(fetchedDates.length).toBeGreaterThanOrEqual(1);

    const stale = await prisma.businessDayImport.findUniqueOrThrow({
      where: {
        storeId_businessDate: { storeId, businessDate: staleDate },
      },
    });
    // Stale RUNNING must not stay RUNNING forever
    expect(stale.fetchStatus).not.toBe("RUNNING");
  });
});
