import type { PeriodImportBundle } from "@/compile/load-period-imports";
import { filterImportBundleForPeriod } from "@/import/filter-import-for-period";
import { prisma } from "@/lib/prisma";

/** Load parsed import data from the active ImportRun for one PayPeriod. */
export async function loadImportFromDb(
  storeId: string,
  periodKey: string
): Promise<PeriodImportBundle | null> {
  const period = await prisma.payPeriod.findUnique({
    where: { storeId_periodKey: { storeId, periodKey } },
    select: { id: true, activeImportRunId: true },
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
      payPeriod: { select: { periodKey: true } },
      checkoutLines: true,
      punchPairs: true,
      noteClicks: true,
      noteOuterItems: true,
    },
  });
  if (!run) {
    return null;
  }

  const importPeriodKey = run.payPeriod.periodKey;
  const samePeriodImport = importPeriodKey === periodKey;
  const bundle = filterImportBundleForPeriod(
    {
      periodKey: importPeriodKey,
      source: "db" as const,
      noteDrilldownsFromFixtureFallback: false,
      checkoutLines: run.checkoutLines.map((line) => ({
        nickname: line.nickname,
        amount: line.amount,
        orderer: line.orderer,
        at: line.occurredAt,
        voided: line.voided,
      })),
      punchPairs: samePeriodImport
        ? run.punchPairs.map((pair) => ({
            nickname: pair.nickname,
            hours: pair.hours,
            // Ingest already scoped pairs to this 薪資期間; clock times are not persisted.
            clockIn: new Date(0),
            clockOut: new Date(0),
          }))
        : [],
      noteClicks: run.noteClicks.map((click) => ({
        itemName: click.itemName,
        nickname: click.nickname,
        clicks: click.clicks,
      })),
      noteOuterItems: run.noteOuterItems.map((item) => ({
        name: item.name,
        clicks: item.clicks,
        priceTotal: item.priceTotal,
      })),
      noteOuterComplete: run.noteOuterComplete,
    },
    periodKey,
    importPeriodKey,
    { punchPairsPreScoped: samePeriodImport }
  );

  return bundle;
}
