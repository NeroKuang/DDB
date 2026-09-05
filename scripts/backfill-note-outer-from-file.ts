import { readFileSync } from "fs";
import {
  mergeNoteOuterItems,
  parseNoteOuterFromSheets,
} from "@/import/parse-note-analysis";
import { readAllSheetsFromBuffer } from "@/import/read-xlsx-sheet";
import { prisma } from "@/lib/prisma";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

/**
 * Backfill 售價 from a local 文字註記分析 / modifier-analysis xlsx.
 *
 * Usage:
 *   npx tsx scripts/backfill-note-outer-from-file.ts 2026-08 ./文字註記分析_....xlsx
 */
async function main(): Promise<void> {
  const periodKey = process.argv[2]?.trim();
  const filePath = process.argv[3]?.trim();
  if (!periodKey || !filePath) {
    console.error(
      "用法: npx tsx scripts/backfill-note-outer-from-file.ts <periodKey> <note-outer.xlsx>"
    );
    process.exit(1);
  }

  const store = await prisma.store.findUniqueOrThrow({
    where: { code: ZHONGSHAN_STORE_CODE },
    select: { id: true },
  });
  const period = await prisma.payPeriod.findUnique({
    where: {
      storeId_periodKey: { storeId: store.id, periodKey },
    },
    select: { activeImportRunId: true },
  });
  if (!period?.activeImportRunId) {
    throw new Error(`找不到 ${periodKey} 的有效匯入`);
  }

  const bytes = readFileSync(filePath);
  const drilldowns = await prisma.importNoteClick.findMany({
    where: { importRunId: period.activeImportRunId },
    distinct: ["itemName"],
    select: { itemName: true },
  });
  const drilldownNames = drilldowns.map((row) => row.itemName);
  const sheets = await readAllSheetsFromBuffer(bytes, filePath);
  const outer = parseNoteOuterFromSheets(sheets, drilldownNames);
  if (outer.length === 0) {
    throw new Error("外層 xlsx 解析為空");
  }

  await prisma.importNoteOuterItem.deleteMany({
    where: { importRunId: period.activeImportRunId },
  });
  await prisma.importNoteOuterItem.createMany({
    data: outer.map((item) => ({
      importRunId: period.activeImportRunId!,
      name: item.name,
      clicks: item.clicks,
      priceTotal: item.priceTotal,
    })),
  });

  console.log(
    `已寫入 ${outer.length} 筆售價至 ${periodKey}（importRun ${period.activeImportRunId}）`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
