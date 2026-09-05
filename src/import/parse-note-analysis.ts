import { roundMoney } from "@/lib/money";
import { readFileSync } from "fs";
import {
  readFirstSheetRows,
  readAllSheetsFromBuffer,
} from "@/import/read-xlsx-sheet";

export type NoteAnalysisClick = {
  itemName: string;
  nickname: string;
  clicks: number;
};

/** One row from 注記分析外層（品項彙總）. */
export type NoteOuterItem = {
  name: string;
  clicks: number;
  /** 累計加減價額：該品項 POS 售價加總（全店）. */
  priceTotal: number;
};

export function noteItemUnitPrice(item: NoteOuterItem): number {
  if (item.clicks <= 0) {
    return 0;
  }
  return roundMoney(item.priceTotal / item.clicks);
}

/** iCHEF 外層偶爾同一品項多列；合併點選數與累計加減價額再算售價。 */
export function mergeNoteOuterItems(
  items: readonly NoteOuterItem[]
): NoteOuterItem[] {
  const merged = new Map<string, { clicks: number; priceTotal: number }>();
  for (const item of items) {
    const existing = merged.get(item.name);
    if (existing) {
      existing.clicks += item.clicks;
      existing.priceTotal = roundMoney(existing.priceTotal + item.priceTotal);
    } else {
      merged.set(item.name, {
        clicks: item.clicks,
        priceTotal: item.priceTotal,
      });
    }
  }
  return [...merged.entries()]
    .map(([name, totals]) => ({ name, ...totals }))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
}

/** itemName → POS 單價（累計加減價額 ÷ 全店點選數）. */
export function buildNoteItemUnitPriceMap(
  outer: readonly NoteOuterItem[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of mergeNoteOuterItems(outer)) {
    map.set(item.name, noteItemUnitPrice(item));
  }
  return map;
}

/** How many drill-down item names appear in the outer list (pricing sanity check). */
export function noteOuterDrilldownOverlapCount(
  outer: readonly NoteOuterItem[],
  drilldownItemNames: ReadonlySet<string> | readonly string[]
): number {
  const expected = new Set(
    [...drilldownItemNames].map((name) => normalizeNoteItemName(name))
  );
  const merged = mergeNoteOuterItems(outer);
  return merged.filter((item) => expected.has(normalizeNoteItemName(item.name)))
    .length;
}

/** Outer list is usable when it mostly matches drill-down 品項名稱 (not 店員暱稱). */
export function isUsableNoteOuterForPricing(
  outer: readonly NoteOuterItem[],
  drilldownItemNames: ReadonlySet<string> | readonly string[]
): boolean {
  const expected = new Set(drilldownItemNames);
  if (expected.size === 0 || outer.length === 0) {
    return false;
  }
  const overlap = noteOuterDrilldownOverlapCount(outer, expected);
  const requiredOverlap = Math.min(
    expected.size,
    Math.max(1, Math.ceil(expected.size * 0.25))
  );
  return overlap >= requiredOverlap;
}

/** True when every drill-down 品項 has a matching outer row (normalized names). */
export function noteOuterMatchesDrilldowns(
  outer: readonly NoteOuterItem[],
  drilldownItemNames: readonly string[]
): boolean {
  const outerNames = new Set(
    mergeNoteOuterItems(outer).map((item) => normalizeNoteItemName(item.name))
  );
  const drillNames = new Set(
    drilldownItemNames.map((name) => normalizeNoteItemName(name))
  );
  return (
    outerNames.size > 0 &&
    drillNames.size > 0 &&
    outerNames.size === drillNames.size &&
    [...outerNames].every((name) => drillNames.has(name))
  );
}

/** Names in outer but without a drill-down file (compare normalized). */
export function noteOuterNamesMissingDrilldowns(
  outer: readonly NoteOuterItem[],
  drilldownItemNames: readonly string[]
): string[] {
  const drillNames = new Set(
    drilldownItemNames.map((name) => normalizeNoteItemName(name))
  );
  return mergeNoteOuterItems(outer)
    .map((item) => item.name)
    .filter((name) => !drillNames.has(normalizeNoteItemName(name)))
    .sort((a, b) => a.localeCompare(b, "zh-Hant"));
}

/** Pick the product-level worksheet (not staff summary) from an outer export. */
export function parseNoteOuterProductSheetFromSheets(
  sheets: readonly string[][][],
  tagNames: readonly string[]
): NoteOuterItem[] {
  const tagSet = new Set(tagNames);
  let best: NoteOuterItem[] = [];
  let bestScore = -1;
  for (const rows of sheets) {
    try {
      const parsed = mergeNoteOuterItems(parseNoteOuterRows(rows));
      if (parsed.length === 0) {
        continue;
      }
      const overlap = parsed.filter((item) => tagSet.has(item.name)).length;
      const overlapRatio =
        tagSet.size > 0 ? overlap / tagSet.size : parsed.length > 0 ? 1 : 0;
      const productLike =
        tagSet.size === 0 ||
        overlapRatio >= 0.25 ||
        isUsableNoteOuterForPricing(parsed, tagNames);
      if (!productLike) {
        continue;
      }
      const score = parsed.length * 100 + overlap * 10;
      if (score > bestScore) {
        bestScore = score;
        best = parsed;
      }
    } catch {
      // try next sheet
    }
  }
  if (best.length === 0) {
    throw new Error(
      "注記分析外層無法對齊品項明細（可能下載到店員彙總而非品項售價表）"
    );
  }
  return best;
}

export async function parseNoteOuterProductSheetFromBuffer(
  bytes: Buffer,
  label: string,
  tagNames: readonly string[]
): Promise<NoteOuterItem[]> {
  const sheets = await readAllSheetsFromBuffer(bytes, label);
  return parseNoteOuterProductSheetFromSheets(sheets, tagNames);
}

/** Prefer DOM scrape when aligned with drill-downs; else parse outer xlsx sheets. */
export async function resolveNoteOuterItems(input: {
  domScrape?: readonly NoteOuterItem[];
  noteOuterBytes: Buffer;
  noteOuterLabel: string;
  drilldownItemNames: readonly string[];
  tagNames?: readonly string[];
}): Promise<{ items: NoteOuterItem[]; complete: boolean }> {
  const drillNames = [...new Set(input.drilldownItemNames)];
  const tagNames = input.tagNames ?? drillNames;
  let items: NoteOuterItem[];
  const fromXlsx = await parseNoteOuterProductSheetFromBuffer(
    input.noteOuterBytes,
    input.noteOuterLabel,
    tagNames
  );
  if (
    input.domScrape &&
    input.domScrape.length > 0 &&
    isUsableNoteOuterForPricing(input.domScrape, drillNames) &&
    noteOuterMatchesDrilldowns(input.domScrape, drillNames)
  ) {
    items = mergeNoteOuterItems(input.domScrape);
  } else if (noteOuterMatchesDrilldowns(fromXlsx, drillNames)) {
    items = fromXlsx;
  } else if (isUsableNoteOuterForPricing(fromXlsx, drillNames)) {
    items = fromXlsx;
  } else {
    items = await parseNoteOuterBuffer(
      input.noteOuterBytes,
      input.noteOuterLabel,
      drillNames
    );
  }
  return {
    items,
    complete: noteOuterMatchesDrilldowns(items, drillNames),
  };
}

export function parseNoteOuterRows(rows: string[][]): NoteOuterItem[] {
  const header = rows[0] ?? [];
  const nameIdx = header.indexOf("名稱");
  const clicksIdx = header.indexOf("點選數");
  const priceIdx = header.indexOf("累計加減價額");
  if (nameIdx < 0 || clicksIdx < 0) {
    throw new Error("注記分析外層缺少名稱或點選數");
  }
  return rows.slice(1).flatMap((row) => {
    const name = (row[nameIdx] ?? "").trim();
    if (!name) {
      return [];
    }
    const clicks = Number(row[clicksIdx] ?? 0) || 0;
    const priceTotal = priceIdx >= 0 ? Number(row[priceIdx] ?? 0) || 0 : 0;
    return [{ name, clicks, priceTotal }];
  });
}

/** Pick the worksheet whose 名稱 column best matches drill-down 品項. */
export function parseNoteOuterFromSheets(
  sheets: readonly string[][][],
  drilldownItemNames: readonly string[]
): NoteOuterItem[] {
  const expected = new Set(drilldownItemNames);
  let best: NoteOuterItem[] = [];
  let bestOverlap = 0;
  for (const rows of sheets) {
    try {
      const parsed = mergeNoteOuterItems(parseNoteOuterRows(rows));
      const overlap = parsed.filter((item) => expected.has(item.name)).length;
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        best = parsed;
      }
    } catch {
      // try next sheet
    }
  }
  if (!isUsableNoteOuterForPricing(best, expected)) {
    throw new Error(
      "注記分析外層無法對齊品項明細（可能下載到店員彙總而非品項售價表）"
    );
  }
  return best;
}

export async function parseNoteOuterList(
  filePath: string,
  drilldownItemNames: readonly string[] = []
): Promise<NoteOuterItem[]> {
  if (drilldownItemNames.length > 0) {
    return parseNoteOuterBuffer(
      readFileSync(filePath),
      filePath,
      drilldownItemNames
    );
  }
  return parseNoteOuterRows(await readFirstSheetRows(filePath));
}

export async function parseNoteOuterBuffer(
  bytes: Buffer,
  label: string,
  drilldownItemNames: readonly string[]
): Promise<NoteOuterItem[]> {
  const sheets = await readAllSheetsFromBuffer(bytes, label);
  return parseNoteOuterFromSheets(sheets, drilldownItemNames);
}

export function parseNoteDrilldownRows(
  rows: string[][],
  itemName: string
): NoteAnalysisClick[] {
  const header = rows[0] ?? [];
  const nameIdx = header.indexOf("名稱");
  const clicksIdx = header.indexOf("點選數");
  if (nameIdx < 0 || clicksIdx < 0) {
    throw new Error(`${itemName} 注記分析明細缺少名稱或點選數`);
  }
  return rows.slice(1).flatMap((row) => {
    const nickname = (row[nameIdx] ?? "").trim();
    if (!nickname) {
      return [];
    }
    return [
      {
        itemName,
        nickname,
        clicks: Number(row[clicksIdx] ?? 0) || 0,
      },
    ];
  });
}

export async function parseNoteDrilldown(
  filePath: string,
  itemName: string
): Promise<NoteAnalysisClick[]> {
  return parseNoteDrilldownRows(await readFirstSheetRows(filePath), itemName);
}

export function itemNameFromDrilldownFilename(filePath: string): string {
  const base = filePath.split("/").pop() ?? filePath;
  return decodeNoteItemNameFromFilename(
    base.replace(/_\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}\.xlsx$/i, "")
  );
}

/**
 * Encode 品項名 for an upload/storage filename.
 * ASCII `/` is not legal in paths; use U+2215 so round-trip stays lossless.
 */
export function encodeNoteItemNameForFilename(name: string): string {
  return name.replace(/\//g, "∕");
}

export function decodeNoteItemNameFromFilename(name: string): string {
  return name.replace(/∕/g, "/");
}

/** Loose match for iCHEF outer xlsx name vs on-page tag / drill-down filename. */
export function normalizeNoteItemName(name: string): string {
  return name
    .normalize("NFKC")
    .replace(/[\s\u3000._\-/∕（）()＋+*,．。：:；;！!？?「」【】[\]'"]/g, "")
    .replace(/[Ｘx×]/g, "X")
    .toLowerCase();
}
