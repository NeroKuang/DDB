import { storageDirForFetchRange } from "@/fetch/save-fetched-to-storage";
import { uploadDirectoryToMinioEvidence } from "@/import/minio-evidence";

export async function mirrorStoredIchefToMinio(
  range: { startDate: string; endDate: string },
  root = process.cwd()
): Promise<{ uploaded: number; skipped: boolean }> {
  const dir = storageDirForFetchRange(range, root);
  const prefix = `ichef/${range.startDate}_${range.endDate}`;
  return uploadDirectoryToMinioEvidence(dir, prefix);
}
