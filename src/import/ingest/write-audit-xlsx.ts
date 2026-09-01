import ExcelJS from "exceljs";
import type { CompileResult } from "@/compile/types";
import type { ImportSource } from "@prisma/client";

export type AuditWorkbookInput = {
  importRunId: string;
  source: ImportSource;
  startedAt: Date;
  fileNames: string[];
  compile: CompileResult;
};

const PAY_HEADERS = [
  "legalName",
  "primaryNickname",
  "title",
  "kind",
  "venue",
  "sales",
  "commission",
  "hours",
  "basePay",
  "targetBonus",
  "taskBonus",
  "netPay",
  "storedNetPay",
];

function addSheetFromRows(
  workbook: ExcelJS.Workbook,
  name: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  const sheet = workbook.addWorksheet(name);
  sheet.addRow(headers);
  for (const row of rows) {
    sheet.addRow(row);
  }
}

export async function buildAuditWorkbookBytes(
  input: AuditWorkbookInput
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const payRows = input.compile.payRows.map((row) => [
    row.legalName,
    row.primaryNickname,
    row.title,
    row.kind,
    row.venue,
    row.original.sales,
    row.original.commission,
    row.original.hours,
    row.original.basePay,
    row.original.targetBonus,
    row.original.taskBonus,
    row.original.netPay,
    row.stored.netPay,
  ]);
  addSheetFromRows(workbook, "薪資報表", PAY_HEADERS, payRows);

  addSheetFromRows(
    workbook,
    "未對上暱稱",
    ["nickname", "amount"],
    input.compile.unmatchedNicknames.map((row) => [row.nickname, row.amount])
  );

  addSheetFromRows(
    workbook,
    "未對上點選",
    ["itemName", "nickname", "clicks"],
    input.compile.unmatchedClicks.map((row) => [
      row.itemName,
      row.nickname,
      row.clicks,
    ])
  );

  addSheetFromRows(
    workbook,
    "匯入中繼",
    ["field", "value"],
    [
      ["importRunId", input.importRunId],
      ["source", input.source],
      ["startedAt", input.startedAt.toISOString()],
      ["fileCount", input.fileNames.length],
      ...input.fileNames.map((name, index) => [`file${index + 1}`, name]),
      ["payRowCount", input.compile.payRows.length],
      ["lockEligible", input.compile.lockEligible ? "yes" : "no"],
      [
        "requiredImportsComplete",
        input.compile.requiredImportsComplete ? "yes" : "no",
      ],
    ]
  );

  const bytes = await workbook.xlsx.writeBuffer();
  return Buffer.from(bytes);
}
