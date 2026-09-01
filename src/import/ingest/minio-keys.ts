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

export function rawArchiveMinioKey(
  storeCode: string,
  periodKey: string
): string {
  return `raw/${storeCode}/${periodKey}/${periodKey}.tar.gz`;
}

export function rawPrefix(storeCode: string, periodKey: string): string {
  return `raw/${storeCode}/${periodKey}`;
}

/** Parse raw/{storeCode}/{periodKey}/... */
export function parseRawMinioKey(key: string): {
  storeCode: string;
  periodKey: string;
  filename: string;
} | null {
  const match = /^raw\/([^/]+)\/(\d{4}-\d{2})\/(.+)$/.exec(key);
  if (!match) {
    return null;
  }
  return {
    storeCode: match[1],
    periodKey: match[2],
    filename: match[3],
  };
}
