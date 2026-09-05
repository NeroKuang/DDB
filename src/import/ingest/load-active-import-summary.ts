import type { ImportSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { businessDaysForPeriodKey } from "@/compile/period-catalog";

export type ActiveImportSummary = {
  periodKey: string;
  businessDayStart: string;
  businessDayEnd: string;
  hasActiveImport: boolean;
  source: ImportSource | null;
  finishedAt: Date | null;
  fileRangeStart: string | null;
  fileRangeEnd: string | null;
  noteOuterComplete: boolean;
  checkoutLineCount: number;
  punchPairCount: number;
  noteClickCount: number;
  rawFileCount: number;
};

export async function loadActiveImportSummary(
  storeId: string,
  periodKey: string
): Promise<ActiveImportSummary> {
  const businessDays = businessDaysForPeriodKey(periodKey);
  const empty: ActiveImportSummary = {
    periodKey,
    businessDayStart: businessDays.startIso,
    businessDayEnd: businessDays.endIso,
    hasActiveImport: false,
    source: null,
    finishedAt: null,
    fileRangeStart: null,
    fileRangeEnd: null,
    noteOuterComplete: false,
    checkoutLineCount: 0,
    punchPairCount: 0,
    noteClickCount: 0,
    rawFileCount: 0,
  };

  const period = await prisma.payPeriod.findUnique({
    where: { storeId_periodKey: { storeId, periodKey } },
    select: { activeImportRunId: true },
  });
  if (!period?.activeImportRunId) {
    return empty;
  }

  const run = await prisma.importRun.findFirst({
    where: {
      id: period.activeImportRunId,
      status: "SUCCEEDED",
    },
    include: {
      _count: {
        select: {
          checkoutLines: true,
          punchPairs: true,
          noteClicks: true,
          rawFiles: true,
        },
      },
    },
  });
  if (!run) {
    return empty;
  }

  return {
    periodKey,
    businessDayStart: businessDays.startIso,
    businessDayEnd: businessDays.endIso,
    hasActiveImport: true,
    source: run.source,
    finishedAt: run.finishedAt,
    fileRangeStart: run.fileRangeStart,
    fileRangeEnd: run.fileRangeEnd,
    noteOuterComplete: run.noteOuterComplete,
    checkoutLineCount: run._count.checkoutLines,
    punchPairCount: run._count.punchPairs,
    noteClickCount: run._count.noteClicks,
    rawFileCount: run._count.rawFiles,
  };
}
