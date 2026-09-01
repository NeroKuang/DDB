import { readFirstSheetRows } from "@/import/read-xlsx-sheet";

export type NoteAnalysisClick = {
  itemName: string;
  nickname: string;
  clicks: number;
};

export type NoteOuterItem = {
  name: string;
  clicks: number;
};

export function parseNoteOuterRows(rows: string[][]): NoteOuterItem[] {
  const header = rows[0] ?? [];
  const nameIdx = header.indexOf("名稱");
  const clicksIdx = header.indexOf("點選數");
  if (nameIdx < 0 || clicksIdx < 0) {
    throw new Error("注記分析外層缺少名稱或點選數");
  }
  return rows.slice(1).flatMap((row) => {
    const name = (row[nameIdx] ?? "").trim();
    if (!name) {
      return [];
    }
    return [{ name, clicks: Number(row[clicksIdx] ?? 0) || 0 }];
  });
}

export async function parseNoteOuterList(
  filePath: string
): Promise<NoteOuterItem[]> {
  return parseNoteOuterRows(await readFirstSheetRows(filePath));
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
  return base.replace(/_\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}\.xlsx$/, "");
}
