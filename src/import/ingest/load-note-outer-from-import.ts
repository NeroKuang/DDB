import type { NoteOuterItem } from "@/import/parse-note-analysis";
import {
  buildNoteItemUnitPriceMap,
  isUsableNoteOuterForPricing,
  mergeNoteOuterItems,
  parseNoteOuterBuffer,
} from "@/import/parse-note-analysis";
import {
  getMinioObjectBuffer,
  isMinioConfigured,
} from "@/import/minio-object-store";
import { prisma } from "@/lib/prisma";

function filterUsableOuter(
  outer: NoteOuterItem[],
  drilldownItemNames: readonly string[]
): NoteOuterItem[] {
  const merged = mergeNoteOuterItems(outer);
  return isUsableNoteOuterForPricing(merged, drilldownItemNames) ? merged : [];
}

/** Load NOTE_OUTER rows aligned to drill-down 品項 (skip staff-summary mistaken as outer). */
export async function loadNoteOuterItemsFromDbImport(
  storeId: string,
  periodKey: string,
  drilldownItemNames: readonly string[]
): Promise<NoteOuterItem[]> {
  const period = await prisma.payPeriod.findUnique({
    where: { storeId_periodKey: { storeId, periodKey } },
    select: { activeImportRunId: true },
  });
  if (!period?.activeImportRunId || drilldownItemNames.length === 0) {
    return [];
  }

  const rows = await prisma.importNoteOuterItem.findMany({
    where: { importRunId: period.activeImportRunId },
    select: { name: true, clicks: true, priceTotal: true },
    orderBy: { name: "asc" },
  });
  if (rows.length > 0) {
    const fromDb = filterUsableOuter(
      rows.map((row) => ({
        name: row.name,
        clicks: row.clicks,
        priceTotal: row.priceTotal,
      })),
      drilldownItemNames
    );
    if (fromDb.length > 0) {
      return fromDb;
    }
  }

  if (!isMinioConfigured()) {
    return [];
  }

  const raw = await prisma.importRawFile.findFirst({
    where: {
      importRunId: period.activeImportRunId,
      kind: "NOTE_OUTER",
    },
    select: { minioKey: true, originalName: true },
  });
  if (!raw) {
    return [];
  }

  try {
    const bytes = await getMinioObjectBuffer(raw.minioKey);
    return parseNoteOuterBuffer(bytes, raw.originalName, drilldownItemNames);
  } catch {
    return [];
  }
}

export async function loadNoteItemUnitPricesForPeriod(
  storeId: string,
  periodKey: string,
  drilldownItemNames: readonly string[]
): Promise<Map<string, number>> {
  const outer = await loadNoteOuterItemsFromDbImport(
    storeId,
    periodKey,
    drilldownItemNames
  );
  if (outer.length === 0) {
    return new Map();
  }
  return buildNoteItemUnitPriceMap(outer);
}
