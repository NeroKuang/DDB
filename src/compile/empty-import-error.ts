/** User-facing message when a period has no DB／storage／fixture import yet. */
export function emptyPeriodImportMessage(periodKey: string): string {
  return `本期（${periodKey}）尚無 iCHEF 匯入，請先對該月執行網頁取數或上傳。`;
}

/** True when compile failed only because imports are missing (empty deploy / no fetch yet). */
export function isEmptyImportCompileError(message: string): boolean {
  return (
    /尚無 iCHEF 匯入/.test(message) ||
    /打卡檔缺失/.test(message) ||
    /^File not found:/i.test(message)
  );
}
