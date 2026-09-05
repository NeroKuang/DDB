import type { AccountRole } from "@prisma/client";
import {
  buildNoteItemUnitPriceMap,
  isUsableNoteOuterForPricing,
  mergeNoteOuterItems,
} from "@/import/parse-note-analysis";
import { prisma } from "@/lib/prisma";
import { roundMoney } from "@/lib/money";
import { isGiftItemName } from "@/pos-items/gift-item";

export type StoredPosItem = {
  id: string;
  name: string;
  unitPrice: number;
  isGift: boolean;
  lastSeenAt: Date;
};

export type PosItemCatalogEntry = {
  unitPrice: number;
  isGift: boolean;
};

function requireAdmin(actorRole: AccountRole): void {
  if (actorRole !== "ADMIN") {
    throw new Error("Only Admin can change 品項售價");
  }
}

export async function listPosItemsForStore(
  storeId: string
): Promise<StoredPosItem[]> {
  const rows = await prisma.posItem.findMany({
    where: { storeId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      unitPrice: true,
      isGift: true,
      lastSeenAt: true,
    },
  });
  return rows;
}

export async function loadPosItemUnitPriceMap(
  storeId: string
): Promise<Map<string, number>> {
  const catalog = await loadPosItemCatalog(storeId);
  return new Map(
    [...catalog.entries()].map(([name, entry]) => [name, entry.unitPrice])
  );
}

export async function loadPosItemCatalog(
  storeId: string
): Promise<Map<string, PosItemCatalogEntry>> {
  const rows = await prisma.posItem.findMany({
    where: { storeId },
    select: { name: true, unitPrice: true, isGift: true },
  });
  return new Map(
    rows.map((row) => [
      row.name,
      { unitPrice: row.unitPrice, isGift: row.isGift },
    ])
  );
}

export async function updatePosItemUnitPrice(input: {
  actorRole: AccountRole;
  storeId: string;
  itemId: string;
  unitPrice: number;
}): Promise<StoredPosItem> {
  requireAdmin(input.actorRole);
  if (!(input.unitPrice >= 0) || Number.isNaN(input.unitPrice)) {
    throw new Error("售價不可為負");
  }
  const existing = await prisma.posItem.findFirst({
    where: { id: input.itemId, storeId: input.storeId },
  });
  if (!existing) {
    throw new Error("找不到品項");
  }
  const gift = existing.isGift || isGiftItemName(existing.name);
  if (gift && input.unitPrice !== 0) {
    throw new Error("兌換／贈送品售價固定為 0");
  }
  const row = await prisma.posItem.update({
    where: { id: existing.id },
    data: {
      unitPrice: gift ? 0 : roundMoney(input.unitPrice),
      isGift: gift,
    },
    select: {
      id: true,
      name: true,
      unitPrice: true,
      isGift: true,
      lastSeenAt: true,
    },
  });
  return row;
}

export async function updatePosItemGift(input: {
  actorRole: AccountRole;
  storeId: string;
  itemId: string;
  isGift: boolean;
}): Promise<StoredPosItem> {
  requireAdmin(input.actorRole);
  const existing = await prisma.posItem.findFirst({
    where: { id: input.itemId, storeId: input.storeId },
  });
  if (!existing) {
    throw new Error("找不到品項");
  }
  const row = await prisma.posItem.update({
    where: { id: existing.id },
    data: {
      isGift: input.isGift,
      unitPrice: input.isGift ? 0 : existing.unitPrice,
    },
    select: {
      id: true,
      name: true,
      unitPrice: true,
      isGift: true,
      lastSeenAt: true,
    },
  });
  return row;
}

async function suggestedPricesFromImportRun(
  importRunId: string,
  itemNames: readonly string[]
): Promise<Map<string, number>> {
  const outerRows = await prisma.importNoteOuterItem.findMany({
    where: { importRunId },
    select: { name: true, clicks: true, priceTotal: true },
  });
  if (outerRows.length === 0) {
    return new Map();
  }
  const merged = mergeNoteOuterItems(
    outerRows.map((row) => ({
      name: row.name,
      clicks: row.clicks,
      priceTotal: row.priceTotal,
    }))
  );
  if (!isUsableNoteOuterForPricing(merged, itemNames)) {
    return new Map();
  }
  return buildNoteItemUnitPriceMap(merged);
}

/** Upsert item names from ImportRun.noteClicks; never overwrite Admin-set unitPrice. */
export async function syncPosItemsFromImportRun(
  importRunId: string
): Promise<{ created: number; touched: number }> {
  const run = await prisma.importRun.findUnique({
    where: { id: importRunId },
    select: {
      payPeriod: { select: { storeId: true } },
      noteClicks: { distinct: ["itemName"], select: { itemName: true } },
    },
  });
  if (!run) {
    return { created: 0, touched: 0 };
  }

  const storeId = run.payPeriod.storeId;
  const names = run.noteClicks
    .map((row) => row.itemName.trim())
    .filter(Boolean);
  const uniqueNames = [...new Set(names)];
  if (uniqueNames.length === 0) {
    return { created: 0, touched: 0 };
  }

  const suggested = await suggestedPricesFromImportRun(
    importRunId,
    uniqueNames
  );
  const now = new Date();
  let created = 0;
  let touched = 0;

  for (const name of uniqueNames) {
    const gift = isGiftItemName(name);
    const existing = await prisma.posItem.findUnique({
      where: { storeId_name: { storeId, name } },
      select: { id: true, unitPrice: true, isGift: true },
    });
    if (existing) {
      const data: {
        lastSeenAt: Date;
        isGift?: boolean;
        unitPrice?: number;
      } = { lastSeenAt: now };
      if (gift && existing.unitPrice === 0) {
        data.isGift = true;
        data.unitPrice = 0;
      }
      await prisma.posItem.update({
        where: { id: existing.id },
        data,
      });
      touched += 1;
      continue;
    }
    const seedPrice = gift ? 0 : (suggested.get(name) ?? 0);
    await prisma.posItem.create({
      data: {
        storeId,
        name,
        unitPrice: seedPrice,
        isGift: gift,
        lastSeenAt: now,
      },
    });
    created += 1;
    touched += 1;
  }

  return { created, touched };
}

export async function syncPosItemsFromActiveImport(
  storeId: string,
  periodKey: string
): Promise<{ created: number; touched: number }> {
  const period = await prisma.payPeriod.findUnique({
    where: { storeId_periodKey: { storeId, periodKey } },
    select: { activeImportRunId: true },
  });
  if (!period?.activeImportRunId) {
    throw new Error(`本期（${periodKey}）尚無有效匯入，無法偵測品項`);
  }
  return syncPosItemsFromImportRun(period.activeImportRunId);
}

export async function deletePosItem(input: {
  actorRole: AccountRole;
  storeId: string;
  itemId: string;
}): Promise<void> {
  requireAdmin(input.actorRole);
  await prisma.posItem.deleteMany({
    where: { id: input.itemId, storeId: input.storeId },
  });
}
