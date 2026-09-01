import type { PeriodImportBundle } from "@/compile/load-period-imports";
import { prisma } from "@/lib/prisma";

/** Load parsed import data from the active ImportRun for one PayPeriod. */
export async function loadImportFromDb(
  storeId: string,
  periodKey: string
): Promise<PeriodImportBundle | null> {
  const period = await prisma.payPeriod.findUnique({
    where: { storeId_periodKey: { storeId, periodKey } },
    select: { activeImportRunId: true },
  });
  if (!period?.activeImportRunId) {
    return null;
  }

  const run = await prisma.importRun.findFirst({
    where: {
      id: period.activeImportRunId,
      status: "SUCCEEDED",
    },
    include: {
      checkoutLines: true,
      punchPairs: true,
      noteClicks: true,
      rawFiles: true,
    },
  });
  if (!run) {
    return null;
  }

  return {
    periodKey,
    source: "db",
    noteDrilldownsFromFixtureFallback: false,
    checkoutLines: run.checkoutLines.map((line) => ({
      nickname: line.nickname,
      amount: line.amount,
      orderer: line.orderer,
      at: line.occurredAt,
      voided: line.voided,
    })),
    punchPairs: run.punchPairs.map((pair) => ({
      nickname: pair.nickname,
      hours: pair.hours,
      clockIn: new Date(0),
      clockOut: new Date(0),
    })),
    noteClicks: run.noteClicks.map((click) => ({
      itemName: click.itemName,
      nickname: click.nickname,
      clicks: click.clicks,
    })),
    noteOuterComplete: run.noteOuterComplete,
  };
}
