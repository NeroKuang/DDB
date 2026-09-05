import ExcelJS from "exceljs";

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }
    if ("result" in value && value.result != null) {
      return cellToString(value.result as ExcelJS.CellValue);
    }
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
    if ("formula" in value && "result" in value) {
      return cellToString(value.result as ExcelJS.CellValue);
    }
  }
  return "";
}

export async function readFirstSheetFromWorkbook(
  workbook: ExcelJS.Workbook,
  label: string
): Promise<string[][]> {
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error(`No worksheet in ${label}`);
  }
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cells[colNumber - 1] = cellToString(cell.value);
    });
    rows.push(cells.map((cell) => cell ?? ""));
  });
  return rows;
}

export async function readFirstSheetRows(
  filePath: string
): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  return readFirstSheetFromWorkbook(workbook, filePath);
}

export async function readAllSheetsFromBuffer(
  bytes: Buffer,
  label: string
): Promise<string[][][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]
  );
  const sheets: string[][][] = [];
  for (const sheet of workbook.worksheets) {
    const rows: string[][] = [];
    sheet.eachRow({ includeEmpty: true }, (row) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cells[colNumber - 1] = cellToString(cell.value);
      });
      rows.push(cells.map((cell) => cell ?? ""));
    });
    sheets.push(rows);
  }
  if (sheets.length === 0) {
    throw new Error(`No worksheet in ${label}`);
  }
  return sheets;
}

export async function readFirstSheetFromBuffer(
  bytes: Buffer,
  label: string
): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    bytes as unknown as Parameters<ExcelJS.Xlsx["load"]>[0]
  );
  return readFirstSheetFromWorkbook(workbook, label);
}
