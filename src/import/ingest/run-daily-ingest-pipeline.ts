import type { ImportSource } from "@prisma/client";
import {
  boundsForBusinessDateRange,
  ichefFileRangeForBusinessDate,
  periodKeyForBusinessDate,
} from "@/lib/business-day";
import { prisma } from "@/lib/prisma";
import { sha256Hex, uploadBufferToMinio } from "@/import/minio-evidence";
import { rawDayMinioKey } from "@/import/ingest/minio-keys";
import { parseCheckoutRows } from "@/import/parse-checkout";
import { parsePunchRows } from "@/import/parse-punches";
import { readFirstSheetFromBuffer } from "@/import/read-xlsx-sheet";
import {
  classifyUploadedFiles,
  type UploadFileInput,
} from "@/import/upload-ichef-files";
import { ensurePayPeriodRow } from "@/pay-period/ensure-period-row";

export type DailyIngestInput = {
  storeId: string;
  storeCode: string;
  businessDate: string;
  source: ImportSource;
  files: UploadFileInput[];
};

export type DailyIngestResult = {
  importRunId: string;
  checkoutLineCount: number;
  punchPairCount: number;
  minioSkipped: boolean;
};

async function markImportRunFailed(
  importRunId: string,
  message: string
): Promise<void> {
  await prisma.importRun.update({
    where: { id: importRunId },
    data: {
      status: "FAILED",
      finishedAt: new Date(),
      errorMessage: message.slice(0, 2000),
    },
  });
}

/**
 * Ingest checkout + punches for one 營業日.
 * Does not compile payroll, does not touch PayPeriod.activeImportRunId.
 */
export async function runDailyIngestPipeline(
  input: DailyIngestInput
): Promise<DailyIngestResult> {
  const periodKey = periodKeyForBusinessDate(input.businessDate);
  const payPeriod = await ensurePayPeriodRow(input.storeId, periodKey);
  const bounds = boundsForBusinessDateRange(
    input.businessDate,
    input.businessDate
  );
  const period = {
    start: new Date(bounds.startIso),
    end: new Date(bounds.endIso),
  };
  const fileRange = ichefFileRangeForBusinessDate(input.businessDate);

  const classified = classifyUploadedFiles(input.files);
  if (!classified.checkout || !classified.punches) {
    throw new Error("每日取數需要結帳／作廢與打卡兩份 xlsx");
  }
  if (classified.noteOuter || classified.drilldowns.length > 0) {
    throw new Error("每日取數不得含注記分析檔");
  }

  const checkoutLines = parseCheckoutRows(
    await readFirstSheetFromBuffer(
      classified.checkout.bytes,
      classified.checkout.filename
    ),
    period
  );
  const punches = parsePunchRows(
    await readFirstSheetFromBuffer(
      classified.punches.bytes,
      classified.punches.filename
    ),
    period
  );

  const rawUploads = [
    {
      kind: "CHECKOUT" as const,
      originalName: classified.checkout.filename,
      bytes: classified.checkout.bytes,
    },
    {
      kind: "PUNCHES" as const,
      originalName: classified.punches.filename,
      bytes: classified.punches.bytes,
    },
  ];

  const importRun = await prisma.importRun.create({
    data: {
      payPeriodId: payPeriod.id,
      kind: "BUSINESS_DAY",
      businessDate: input.businessDate,
      source: input.source,
      status: "RUNNING",
      fileRangeStart: fileRange.startDate,
      fileRangeEnd: fileRange.endDate,
      noteOuterComplete: false,
      checkoutLines: {
        create: checkoutLines.map((line) => ({
          nickname: line.nickname,
          amount: line.amount,
          orderer: line.orderer,
          voided: line.voided,
          occurredAt: line.at,
        })),
      },
      punchPairs: {
        create: punches.pairs.map((pair) => ({
          nickname: pair.nickname,
          hours: pair.hours,
          paired: true,
          clockInAt: pair.clockIn,
          clockOutAt: pair.clockOut,
        })),
      },
      rawFiles: {
        create: rawUploads.map((file) => ({
          kind: file.kind,
          originalName: file.originalName,
          minioKey: rawDayMinioKey(
            input.storeCode,
            input.businessDate,
            file.originalName
          ),
          sha256: sha256Hex(file.bytes),
          sizeBytes: file.bytes.length,
        })),
      },
    },
  });

  let minioSkipped = true;
  try {
    for (const file of rawUploads) {
      const uploaded = await uploadBufferToMinio(
        rawDayMinioKey(input.storeCode, input.businessDate, file.originalName),
        file.bytes
      );
      if (!uploaded.skipped) {
        minioSkipped = false;
      }
    }

    await prisma.$transaction([
      prisma.importRun.update({
        where: { id: importRun.id },
        data: {
          status: "SUCCEEDED",
          finishedAt: new Date(),
          errorMessage: null,
        },
      }),
      prisma.businessDayImport.upsert({
        where: {
          storeId_businessDate: {
            storeId: input.storeId,
            businessDate: input.businessDate,
          },
        },
        create: {
          storeId: input.storeId,
          businessDate: input.businessDate,
          activeImportRunId: importRun.id,
          fetchStatus: "SUCCEEDED",
          fetchFinishedAt: new Date(),
          fetchErrorMessage: null,
          fetchRangeStart: fileRange.startDate,
          fetchRangeEnd: fileRange.endDate,
        },
        update: {
          activeImportRunId: importRun.id,
          fetchStatus: "SUCCEEDED",
          fetchFinishedAt: new Date(),
          fetchErrorMessage: null,
          fetchRangeStart: fileRange.startDate,
          fetchRangeEnd: fileRange.endDate,
        },
      }),
    ]);

    return {
      importRunId: importRun.id,
      checkoutLineCount: checkoutLines.length,
      punchPairCount: punches.pairs.length,
      minioSkipped,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "每日匯入失敗";
    await markImportRunFailed(importRun.id, message);
    throw error;
  }
}
