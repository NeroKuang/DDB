import { getPeriodCatalogEntry } from "@/compile/period-catalog";
import { loadPerformanceFilesPreferringStorage } from "@/import/load-stored-ichef";
import { loadNoteOuterItemsFromDbImport } from "@/import/ingest/load-note-outer-from-import";
import {
  buildNoteItemUnitPriceMap,
  isUsableNoteOuterForPricing,
  mergeNoteOuterItems,
  parseNoteOuterList,
} from "@/import/parse-note-analysis";
import { prisma } from "@/lib/prisma";
import { isGiftItemName } from "@/pos-items/gift-item";

function mergePriceHints(
  target: Map<string, number>,
  source: ReadonlyMap<string, number>
): void {
  for (const [name, price] of source) {
    if (price > 0 && !target.has(name)) {
      target.set(name, price);
    }
  }
}

/** Collect POS 售價 hints from import outer / storage (one-time seed; Admin 主檔優先). */
export async function collectOuterPriceHints(
  storeId: string,
  periodKey: string,
  itemNames: readonly string[]
): Promise<Map<string, number>> {
  const hints = new Map<string, number>();
  if (itemNames.length === 0) {
    return hints;
  }

  const fromActive = await loadNoteOuterItemsFromDbImport(
    storeId,
    periodKey,
    itemNames
  );
  if (fromActive.length > 0) {
    mergePriceHints(hints, buildNoteItemUnitPriceMap(fromActive));
  }

  const runs = await prisma.importRun.findMany({
    where: {
      status: "SUCCEEDED",
      payPeriod: { storeId },
    },
    select: {
      id: true,
      noteOuterItems: {
        select: { name: true, clicks: true, priceTotal: true },
      },
      noteClicks: {
        distinct: ["itemName"],
        select: { itemName: true },
      },
    },
    orderBy: { finishedAt: "desc" },
    take: 12,
  });

  for (const run of runs) {
    const drillNames = run.noteClicks.map((row) => row.itemName);
    const outer = mergeNoteOuterItems(
      run.noteOuterItems.map((row) => ({
        name: row.name,
        clicks: row.clicks,
        priceTotal: row.priceTotal,
      }))
    );
    if (!isUsableNoteOuterForPricing(outer, drillNames)) {
      continue;
    }
    mergePriceHints(hints, buildNoteItemUnitPriceMap(outer));
  }

  try {
    const catalog = getPeriodCatalogEntry(periodKey);
    const files = await loadPerformanceFilesPreferringStorage(
      catalog.fileRange,
      {
        periodKey,
      }
    );
    if (files?.noteOuter) {
      mergePriceHints(
        hints,
        buildNoteItemUnitPriceMap(
          await parseNoteOuterList(files.noteOuter, [...itemNames])
        )
      );
    }
  } catch {
    // storage / fixture unavailable for this period
  }

  return hints;
}

/** Fill unitPrice only where still 0; never overwrite Admin-set prices. */
export async function importPosItemPricesFromSources(
  storeId: string,
  periodKey: string
): Promise<{ updated: number; giftMarked: number }> {
  const items = await prisma.posItem.findMany({
    where: { storeId },
    select: { id: true, name: true, unitPrice: true, isGift: true },
  });
  if (items.length === 0) {
    return { updated: 0, giftMarked: 0 };
  }

  const hints = await collectOuterPriceHints(
    storeId,
    periodKey,
    items.map((row) => row.name)
  );

  let updated = 0;
  let giftMarked = 0;

  for (const item of items) {
    const gift = item.isGift || isGiftItemName(item.name);
    if (gift) {
      if (!item.isGift || item.unitPrice !== 0) {
        await prisma.posItem.update({
          where: { id: item.id },
          data: { isGift: true, unitPrice: 0 },
        });
        giftMarked += 1;
      }
      continue;
    }

    if (item.unitPrice > 0) {
      if (item.isGift) {
        await prisma.posItem.update({
          where: { id: item.id },
          data: { isGift: false },
        });
      }
      continue;
    }

    const hint = hints.get(item.name);
    if (hint && hint > 0) {
      await prisma.posItem.update({
        where: { id: item.id },
        data: { unitPrice: hint, isGift: false },
      });
      updated += 1;
    }
  }

  return { updated, giftMarked };
}
