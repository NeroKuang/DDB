import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { JULY_2026_PERIOD_KEY } from "@/ad-hoc-tasks/manage";
import { compilePayPeriodLive } from "@/compile/compile-for-period";
import { fileRangeForPeriodKey } from "@/compile/period-catalog";
import { julyFixturesAsUploadInputs } from "@/import/ingest/july-fixture-bytes";
import { runIngestPipeline } from "@/import/ingest/run-ingest-pipeline";
import { prisma } from "@/lib/prisma";
import { seedZhongshanStoreAndStaff } from "@/staff/seed-zhongshan";

describe("ingest pipeline", () => {
  let storeId = "";
  let payPeriodId = "";

  beforeAll(async () => {
    const seeded = await seedZhongshanStoreAndStaff();
    storeId = seeded.storeId;
    await prisma.importRun.deleteMany({
      where: { payPeriod: { storeId, periodKey: JULY_2026_PERIOD_KEY } },
    });
    await prisma.payPeriod.deleteMany({
      where: { storeId, periodKey: JULY_2026_PERIOD_KEY },
    });
    const period = await prisma.payPeriod.create({
      data: {
        storeId,
        periodKey: JULY_2026_PERIOD_KEY,
        fetchRangeStart: fileRangeForPeriodKey(JULY_2026_PERIOD_KEY).startDate,
        fetchRangeEnd: fileRangeForPeriodKey(JULY_2026_PERIOD_KEY).endDate,
      },
    });
    payPeriodId = period.id;
  });

  afterAll(async () => {
    await prisma.importRun.deleteMany({
      where: { payPeriodId },
    });
    await prisma.payPeriod.deleteMany({ where: { id: payPeriodId } });
  });

  it("parses July fixtures into ImportRun and compiles from DB", async () => {
    const ingested = await runIngestPipeline({
      payPeriodId,
      storeId,
      storeCode: "zhongshan",
      periodKey: JULY_2026_PERIOD_KEY,
      source: "ADMIN_UPLOAD",
      files: julyFixturesAsUploadInputs(),
      fileRange: fileRangeForPeriodKey(JULY_2026_PERIOD_KEY),
    });

    expect(ingested.checkoutLineCount).toBeGreaterThan(0);
    expect(ingested.punchPairCount).toBeGreaterThan(0);
    expect(ingested.noteClickCount).toBeGreaterThan(0);
    expect(ingested.payRowCount).toBeGreaterThan(0);

    const period = await prisma.payPeriod.findUniqueOrThrow({
      where: { id: payPeriodId },
    });
    expect(period.activeImportRunId).toBe(ingested.importRunId);

    const run = await prisma.importRun.findUniqueOrThrow({
      where: { id: ingested.importRunId },
      include: { compileRuns: true },
    });
    expect(run.status).toBe("SUCCEEDED");
    expect(run.compileRuns).toHaveLength(1);

    const compiled = await compilePayPeriodLive({
      storeId,
      periodKey: JULY_2026_PERIOD_KEY,
    });
    expect(compiled.source).toBe("db");
    const fenMing = compiled.result.payRows.find(
      (row) => row.primaryNickname === "粉冥"
    );
    expect(fenMing?.original.sales).toBe(75685);
  });
});
