import type { ImportSource, RawFileKind } from "@prisma/client";
import { randomUUID } from "crypto";
import { compilePayPeriod } from "@/compile/compile-pay-period";
import { buildShopInputsForPeriod } from "@/compile/build-shop-inputs";
import { businessDaysForPeriodKey } from "@/compile/period-catalog";
import { prisma } from "@/lib/prisma";
import { sha256Hex, uploadBufferToMinio } from "@/import/minio-evidence";
import { auditMinioKey, rawMinioKey } from "@/import/ingest/minio-keys";
import { parseUploadSet } from "@/import/ingest/parse-upload-set";
import { buildAuditWorkbookBytes } from "@/import/ingest/write-audit-xlsx";
import type { UploadFileInput } from "@/import/upload-ichef-files";

export type IngestPipelineInput = {
  payPeriodId: string;
  storeId: string;
  storeCode: string;
  periodKey: string;
  source: ImportSource;
  files: UploadFileInput[];
  fileRange: { startDate: string; endDate: string };
};

export type IngestPipelineResult = {
  importRunId: string;
  compileRunId: string;
  minioSkipped: boolean;
  checkoutLineCount: number;
  punchPairCount: number;
  noteClickCount: number;
  payRowCount: number;
};

type RawUpload = {
  kind: RawFileKind;
  originalName: string;
  bytes: Buffer;
};

function rawUploadsFromParsed(
  parsed: Awaited<ReturnType<typeof parseUploadSet>>
): RawUpload[] {
  const { classified } = parsed;
  if (!classified.checkout || !classified.punches || !classified.noteOuter) {
    throw new Error("classified files incomplete");
  }
  return [
    {
      kind: "CHECKOUT",
      originalName: classified.checkout.filename,
      bytes: classified.checkout.bytes,
    },
    {
      kind: "PUNCHES",
      originalName: classified.punches.filename,
      bytes: classified.punches.bytes,
    },
    {
      kind: "NOTE_OUTER",
      originalName: classified.noteOuter.filename,
      bytes: classified.noteOuter.bytes,
    },
    ...classified.drilldowns.map((file) => ({
      kind: "NOTE_DRILLDOWN" as const,
      originalName: file.filename,
      bytes: file.bytes,
    })),
  ];
}

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
 * Parse once → persist ImportRun + lines → MinIO raw → compile → audit xlsx → activeImportRunId.
 * Failed runs do not replace the previous active import (ADR-0083 / ADR-0059).
 */
export async function runIngestPipeline(
  input: IngestPipelineInput
): Promise<IngestPipelineResult> {
  const businessDays = businessDaysForPeriodKey(input.periodKey);
  const period = {
    start: new Date(businessDays.startIso),
    end: new Date(businessDays.endIso),
  };
  const parsed = await parseUploadSet(input.files, period);
  const rawUploads = rawUploadsFromParsed(parsed);

  const importRun = await prisma.importRun.create({
    data: {
      payPeriodId: input.payPeriodId,
      source: input.source,
      status: "RUNNING",
      fileRangeStart: input.fileRange.startDate,
      fileRangeEnd: input.fileRange.endDate,
      noteOuterComplete: parsed.noteOuterComplete,
      checkoutLines: {
        create: parsed.checkoutLines.map((line) => ({
          nickname: line.nickname,
          amount: line.amount,
          orderer: line.orderer,
          voided: line.voided,
          occurredAt: line.at,
        })),
      },
      punchPairs: {
        create: parsed.punchPairs.map((pair) => ({
          nickname: pair.nickname,
          hours: pair.hours,
          paired: true,
        })),
      },
      noteClicks: {
        create: parsed.noteClicks.map((click) => ({
          itemName: click.itemName,
          nickname: click.nickname,
          clicks: click.clicks,
        })),
      },
      rawFiles: {
        create: rawUploads.map((file) => ({
          kind: file.kind,
          originalName: file.originalName,
          minioKey: rawMinioKey(
            input.storeCode,
            input.periodKey,
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
        rawMinioKey(input.storeCode, input.periodKey, file.originalName),
        file.bytes
      );
      if (!uploaded.skipped) {
        minioSkipped = false;
      }
    }

    const { shop, savedStored } = await buildShopInputsForPeriod({
      storeId: input.storeId,
      periodKey: input.periodKey,
      storeCode: input.storeCode,
    });
    const compile = compilePayPeriod({
      shop,
      checkoutLines: parsed.checkoutLines,
      punchPairs: parsed.punchPairs,
      noteClicks: parsed.noteClicks,
      noteOuterComplete: parsed.noteOuterComplete,
      savedStored,
    });

    const compileRunId = randomUUID();
    const auditKey = auditMinioKey(
      input.storeCode,
      input.periodKey,
      compileRunId
    );
    const auditBytes = await buildAuditWorkbookBytes({
      importRunId: importRun.id,
      source: input.source,
      startedAt: importRun.startedAt,
      fileNames: rawUploads.map((file) => file.originalName),
      compile,
    });
    const auditSha256 = sha256Hex(auditBytes);
    const auditUpload = await uploadBufferToMinio(auditKey, auditBytes);
    if (!auditUpload.skipped) {
      minioSkipped = false;
    }

    await prisma.$transaction([
      prisma.compileRun.create({
        data: {
          id: compileRunId,
          importRunId: importRun.id,
          payPeriodId: input.payPeriodId,
          auditMinioKey: auditKey,
          auditSha256,
          payRowCount: compile.payRows.length,
          unmatchedNicknamesCount: compile.unmatchedNicknames.length,
          unmatchedClicksCount: compile.unmatchedClicks.length,
          resultJson: JSON.stringify(compile),
        },
      }),
      prisma.importRun.update({
        where: { id: importRun.id },
        data: {
          status: "SUCCEEDED",
          finishedAt: new Date(),
          errorMessage: null,
        },
      }),
      prisma.payPeriod.update({
        where: { id: input.payPeriodId },
        data: { activeImportRunId: importRun.id },
      }),
    ]);

    return {
      importRunId: importRun.id,
      compileRunId,
      minioSkipped,
      checkoutLineCount: parsed.checkoutLines.length,
      punchPairCount: parsed.punchPairs.length,
      noteClickCount: parsed.noteClicks.length,
      payRowCount: compile.payRows.length,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "匯入 pipeline 失敗";
    await markImportRunFailed(importRun.id, message);
    throw error;
  }
}
