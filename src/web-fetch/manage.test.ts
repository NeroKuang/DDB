import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { JULY_2026_PERIOD_KEY } from "@/ad-hoc-tasks/manage";
import { applyDotEnvFile } from "@/fetch/ichef-web-fetch";
import { julyFixturesAsFetchedComplete } from "@/import/ingest/july-fixture-bytes";
import { prisma } from "@/lib/prisma";
import { serializePeriodSnapshot } from "@/pay-period/snapshot";
import { seedZhongshanStoreAndStaff } from "@/staff/seed-zhongshan";
import {
  getWebFetchProgress,
  runWebFetchJob,
  setWebFetchRunnerForTests,
  startWebFetch,
} from "@/web-fetch/manage";

applyDotEnvFile();

describe("web fetch progress", () => {
  let storeId = "";

  beforeAll(async () => {
    const seeded = await seedZhongshanStoreAndStaff();
    storeId = seeded.storeId;
    await prisma.payPeriod.deleteMany({
      where: { storeId, periodKey: JULY_2026_PERIOD_KEY },
    });
  });

  afterAll(async () => {
    await prisma.importRun.deleteMany({
      where: { payPeriod: { storeId, periodKey: JULY_2026_PERIOD_KEY } },
    });
    await prisma.payPeriod.deleteMany({
      where: { storeId, periodKey: JULY_2026_PERIOD_KEY },
    });
    setWebFetchRunnerForTests(null);
  });

  it("returns IDLE when no row exists", async () => {
    const progress = await getWebFetchProgress(storeId, JULY_2026_PERIOD_KEY);
    expect(progress.status).toBe("IDLE");
  });

  it("rejects Supervisor and locked period", async () => {
    await expect(
      startWebFetch({
        actorRole: "SUPERVISOR",
        storeId,
        periodKey: JULY_2026_PERIOD_KEY,
      })
    ).rejects.toThrow(/Only Admin/);

    await prisma.payPeriod.create({
      data: {
        storeId,
        periodKey: JULY_2026_PERIOD_KEY,
        lockedAt: new Date(),
        snapshotJson: serializePeriodSnapshot({
          version: 1,
          periodLabel: "test",
          periodKey: JULY_2026_PERIOD_KEY,
          lockedAtIso: new Date().toISOString(),
          compile: {
            payRows: [],
            unmatchedNicknames: [],
            blockingUnmatchedNicknames: [],
            unmatchedClicks: [],
            lockEligible: false,
            requiredImportsComplete: false,
          },
          performanceSummaries: [],
        }),
      },
    });
    await expect(
      startWebFetch({
        actorRole: "ADMIN",
        storeId,
        periodKey: JULY_2026_PERIOD_KEY,
      })
    ).rejects.toThrow(/已鎖定/);
    await prisma.payPeriod.deleteMany({
      where: { storeId, periodKey: JULY_2026_PERIOD_KEY },
    });
  });

  it("blocks concurrent fetch for the same store", async () => {
    await prisma.payPeriod.create({
      data: {
        storeId,
        periodKey: JULY_2026_PERIOD_KEY,
        fetchStatus: "RUNNING",
        fetchStartedAt: new Date(),
        fetchRangeStart: "2026-06-30",
        fetchRangeEnd: "2026-08-01",
      },
    });
    await expect(
      startWebFetch({
        actorRole: "ADMIN",
        storeId,
        periodKey: JULY_2026_PERIOD_KEY,
      })
    ).rejects.toThrow(/進行中/);
    await prisma.payPeriod.deleteMany({
      where: { storeId, periodKey: JULY_2026_PERIOD_KEY },
    });
  });

  it("marks SUCCEEDED when runner completes", async () => {
    await prisma.payPeriod.deleteMany({
      where: { storeId, periodKey: JULY_2026_PERIOD_KEY },
    });
    setWebFetchRunnerForTests(async () => julyFixturesAsFetchedComplete());
    const started = await startWebFetch({
      actorRole: "ADMIN",
      storeId,
      periodKey: JULY_2026_PERIOD_KEY,
    });
    expect(started.status).toBe("RUNNING");
    const row = await prisma.payPeriod.findFirstOrThrow({
      where: { storeId, periodKey: JULY_2026_PERIOD_KEY },
    });
    await runWebFetchJob(row.id);
    const done = await getWebFetchProgress(storeId, JULY_2026_PERIOD_KEY);
    expect(done.status).toBe("SUCCEEDED");
    expect(done.errorMessage).toBeNull();
  });

  it("marks FAILED and keeps message when runner throws", async () => {
    setWebFetchRunnerForTests(async () => {
      throw new Error("模擬斷線");
    });
    await prisma.payPeriod.deleteMany({
      where: { storeId, periodKey: JULY_2026_PERIOD_KEY },
    });
    await startWebFetch({
      actorRole: "ADMIN",
      storeId,
      periodKey: JULY_2026_PERIOD_KEY,
    });
    const row = await prisma.payPeriod.findFirstOrThrow({
      where: { storeId, periodKey: JULY_2026_PERIOD_KEY },
    });
    await runWebFetchJob(row.id);
    const done = await getWebFetchProgress(storeId, JULY_2026_PERIOD_KEY);
    expect(done.status).toBe("FAILED");
    expect(done.errorMessage).toContain("模擬斷線");
  });
});
