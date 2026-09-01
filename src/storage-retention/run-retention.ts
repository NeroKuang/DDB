import type { RawRetentionState } from "@prisma/client";
import {
  deleteMinioObject,
  getMinioObjectBuffer,
  isMinioConfigured,
} from "@/import/minio-object-store";
import { rawArchiveMinioKey } from "@/import/ingest/minio-keys";
import { uploadBufferToMinio } from "@/import/minio-evidence";
import { prisma } from "@/lib/prisma";
import {
  monthsSincePeriodKey,
  retentionPhaseForAge,
} from "@/storage-retention/period-age";
import { buildTarGz } from "@/storage-retention/tar-gzip";

export type RetentionGroupKey = {
  storeCode: string;
  periodKey: string;
};

export type StorageRetentionResult = {
  minioConfigured: boolean;
  archived: RetentionGroupKey[];
  purged: RetentionGroupKey[];
  skipped: { group: RetentionGroupKey; reason: string }[];
};

type RawFileRow = {
  id: string;
  minioKey: string;
  originalName: string;
  retentionState: RawRetentionState;
  archivedKey: string | null;
};

const rawFileSelect = {
  id: true,
  minioKey: true,
  originalName: true,
  retentionState: true,
  archivedKey: true,
} as const;

function groupKeyFromParts(
  storeCode: string,
  periodKey: string
): RetentionGroupKey {
  return { storeCode, periodKey };
}

async function loadGroupKeys(): Promise<RetentionGroupKey[]> {
  const rows = await prisma.importRawFile.findMany({
    where: { retentionState: { not: "PURGED" } },
    select: {
      importRun: {
        select: {
          payPeriod: {
            select: {
              periodKey: true,
              store: { select: { code: true } },
            },
          },
        },
      },
    },
  });
  const seen = new Set<string>();
  const groups: RetentionGroupKey[] = [];
  for (const row of rows) {
    const storeCode = row.importRun.payPeriod.store.code;
    const periodKey = row.importRun.payPeriod.periodKey;
    const id = `${storeCode}:${periodKey}`;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    groups.push({ storeCode, periodKey });
  }
  return groups;
}

async function loadGroupFiles(
  group: RetentionGroupKey,
  state?: RawRetentionState
): Promise<RawFileRow[]> {
  return prisma.importRawFile.findMany({
    where: {
      ...(state
        ? { retentionState: state }
        : { retentionState: { not: "PURGED" } }),
      importRun: {
        payPeriod: {
          periodKey: group.periodKey,
          store: { code: group.storeCode },
        },
      },
    },
    select: rawFileSelect,
  });
}

async function archiveGroup(group: RetentionGroupKey): Promise<number> {
  const hotRows = await loadGroupFiles(group, "HOT");
  if (hotRows.length === 0) {
    return 0;
  }
  const archiveKey = rawArchiveMinioKey(group.storeCode, group.periodKey);
  const files = await Promise.all(
    hotRows.map(async (row) => ({
      name: row.originalName,
      bytes: await getMinioObjectBuffer(row.minioKey),
    }))
  );
  const archiveBytes = buildTarGz(files);
  await uploadBufferToMinio(
    archiveKey,
    archiveBytes,
    process.env,
    "application/gzip"
  );
  for (const row of hotRows) {
    await deleteMinioObject(row.minioKey);
  }
  await prisma.importRawFile.updateMany({
    where: { id: { in: hotRows.map((row) => row.id) } },
    data: {
      retentionState: "ARCHIVED",
      archivedKey: archiveKey,
    },
  });
  return hotRows.length;
}

async function purgeGroup(group: RetentionGroupKey): Promise<number> {
  const archivedRows = await loadGroupFiles(group, "ARCHIVED");
  if (archivedRows.length === 0) {
    return 0;
  }
  const archiveKey =
    archivedRows.find((row) => row.archivedKey)?.archivedKey ??
    rawArchiveMinioKey(group.storeCode, group.periodKey);
  try {
    await deleteMinioObject(archiveKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("NoSuchKey") && !message.includes("Not Found")) {
      throw error;
    }
  }
  await prisma.importRawFile.updateMany({
    where: { id: { in: archivedRows.map((row) => row.id) } },
    data: { retentionState: "PURGED" },
  });
  return archivedRows.length;
}

/** Scan raw import files and apply ADR-0083 retention (raw prefix only). */
export async function runStorageRetentionCron(
  now = new Date()
): Promise<StorageRetentionResult> {
  const result: StorageRetentionResult = {
    minioConfigured: isMinioConfigured(),
    archived: [],
    purged: [],
    skipped: [],
  };
  if (!result.minioConfigured) {
    return result;
  }

  const groups = await loadGroupKeys();
  for (const group of groups) {
    const ageMonths = monthsSincePeriodKey(group.periodKey, now);
    const phase = retentionPhaseForAge(ageMonths);
    const hotRows = await loadGroupFiles(group, "HOT");
    const archivedRows = await loadGroupFiles(group, "ARCHIVED");

    try {
      if (phase === "archive" && hotRows.length > 0) {
        await archiveGroup(group);
        result.archived.push(group);
        continue;
      }
      if (phase === "purge" && archivedRows.length > 0) {
        await purgeGroup(group);
        result.purged.push(group);
        continue;
      }
      if (phase === "purge" && hotRows.length > 0) {
        await archiveGroup(group);
        result.archived.push(group);
        await purgeGroup(group);
        result.purged.push(group);
      }
    } catch (error) {
      result.skipped.push({
        group,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}

/** Download archived tar.gz bytes for one store period (throws if not archived). */
export async function downloadRawArchive(input: {
  storeCode: string;
  periodKey: string;
}): Promise<{ filename: string; bytes: Buffer; archiveKey: string }> {
  if (!isMinioConfigured()) {
    throw new Error("MinIO 未設定，無法下載存檔");
  }
  const archived = await prisma.importRawFile.findFirst({
    where: {
      retentionState: "ARCHIVED",
      importRun: {
        payPeriod: {
          periodKey: input.periodKey,
          store: { code: input.storeCode },
        },
      },
    },
    select: { archivedKey: true },
  });
  if (!archived?.archivedKey) {
    throw new Error("此期間尚未壓縮存檔，無法下載");
  }
  const bytes = await getMinioObjectBuffer(archived.archivedKey);
  return {
    filename: `${input.periodKey}.tar.gz`,
    bytes,
    archiveKey: archived.archivedKey,
  };
}

/** Admin-only: archive one period immediately regardless of age. */
export async function archiveRawPeriodNow(input: {
  storeCode: string;
  periodKey: string;
}): Promise<{ archiveKey: string; fileCount: number }> {
  if (!isMinioConfigured()) {
    throw new Error("MinIO 未設定，無法壓縮");
  }
  const fileCount = await archiveGroup(
    groupKeyFromParts(input.storeCode, input.periodKey)
  );
  if (fileCount === 0) {
    throw new Error("此期間沒有可壓縮的原始 xlsx");
  }
  return {
    archiveKey: rawArchiveMinioKey(input.storeCode, input.periodKey),
    fileCount,
  };
}
