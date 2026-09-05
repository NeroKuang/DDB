import {
  mergeNoteOuterItems,
  parseNoteOuterRows,
} from "@/import/parse-note-analysis";
import {
  getMinioObjectBuffer,
  isMinioConfigured,
} from "@/import/minio-object-store";
import { readFirstSheetFromBuffer } from "@/import/read-xlsx-sheet";
import { prisma } from "@/lib/prisma";

/**
 * One-time backfill: parse NOTE_OUTER raw from MinIO into import_note_outer_items.
 * Runs without MinIO env will report skipped runs (re-import those months).
 */
async function main(): Promise<void> {
  if (!isMinioConfigured()) {
    console.error(
      "MinIO 未設定，無法從 raw 回填。請對該月重新執行網頁取數／上傳。"
    );
    process.exit(1);
  }

  const runs = await prisma.importRun.findMany({
    where: { status: "SUCCEEDED" },
    select: {
      id: true,
      payPeriod: { select: { periodKey: true } },
      noteOuterItems: { select: { id: true }, take: 1 },
      rawFiles: {
        where: { kind: "NOTE_OUTER" },
        select: { minioKey: true, originalName: true },
        take: 1,
      },
    },
  });

  let filled = 0;
  let skipped = 0;
  for (const run of runs) {
    if (run.noteOuterItems.length > 0) {
      skipped += 1;
      continue;
    }
    const raw = run.rawFiles[0];
    if (!raw) {
      console.warn(`[${run.payPeriod.periodKey}] ${run.id}: 無 NOTE_OUTER raw`);
      continue;
    }
    try {
      const bytes = await getMinioObjectBuffer(raw.minioKey);
      const outer = mergeNoteOuterItems(
        parseNoteOuterRows(
          await readFirstSheetFromBuffer(bytes, raw.originalName)
        )
      );
      if (outer.length === 0) {
        console.warn(`[${run.payPeriod.periodKey}] ${run.id}: 外層解析為空`);
        continue;
      }
      await prisma.importNoteOuterItem.createMany({
        data: outer.map((item) => ({
          importRunId: run.id,
          name: item.name,
          clicks: item.clicks,
          priceTotal: item.priceTotal,
        })),
        skipDuplicates: true,
      });
      filled += 1;
      console.log(
        `[${run.payPeriod.periodKey}] ${run.id}: 寫入 ${outer.length} 筆售價`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[${run.payPeriod.periodKey}] ${run.id}: ${message}`);
    }
  }

  console.log(`完成：回填 ${filled} 筆 import run，略過已有 ${skipped} 筆。`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
