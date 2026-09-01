export function rawMinioKey(
  storeCode: string,
  periodKey: string,
  filename: string
): string {
  return `raw/${storeCode}/${periodKey}/${filename}`;
}

export function auditMinioKey(
  storeCode: string,
  periodKey: string,
  compileRunId: string
): string {
  return `audit/${storeCode}/${periodKey}/compile-${compileRunId}.xlsx`;
}
