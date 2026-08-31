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

export async function readFirstSheetRows(
  filePath: string
): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error(`No worksheet in ${filePath}`);
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
