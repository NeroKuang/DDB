import type { RawRetentionState } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  monthsSincePeriodKey,
  rawRetentionStateLabel,
  retentionPhaseForAge,
  retentionPhaseLabel,
} from "@/storage-retention/period-age";
import { rawArchiveMinioKey } from "@/import/ingest/minio-keys";

export type RawRetentionGroupView = {
  storeCode: string;
  storeName: string;
  periodKey: string;
  ageMonths: number;
  policyPhase: ReturnType<typeof retentionPhaseForAge>;
  policyLabel: string;
  state: RawRetentionState;
  stateLabel: string;
  fileCount: number;
  archiveKey: string | null;
  canDownload: boolean;
  canArchiveNow: boolean;
};

function dominantState(states: RawRetentionState[]): RawRetentionState {
  if (states.includes("HOT")) {
    return "HOT";
  }
  if (states.includes("ARCHIVED")) {
    return "ARCHIVED";
  }
  return "PURGED";
}

/** List distinct store×period raw retention groups for Admin UI. */
export async function listRawRetentionGroups(
  now = new Date()
): Promise<RawRetentionGroupView[]> {
  const rows = await prisma.importRawFile.findMany({
    where: { retentionState: { not: "PURGED" } },
    select: {
      retentionState: true,
      archivedKey: true,
      importRun: {
        select: {
          payPeriod: {
            select: {
              periodKey: true,
              store: { select: { code: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const grouped = new Map<
    string,
    {
      storeCode: string;
      storeName: string;
      periodKey: string;
      states: RawRetentionState[];
      archivedKey: string | null;
      fileCount: number;
    }
  >();

  for (const row of rows) {
    const store = row.importRun.payPeriod.store;
    const periodKey = row.importRun.payPeriod.periodKey;
    const id = `${store.code}:${periodKey}`;
    const bucket = grouped.get(id) ?? {
      storeCode: store.code,
      storeName: store.name,
      periodKey,
      states: [],
      archivedKey: row.archivedKey,
      fileCount: 0,
    };
    bucket.states.push(row.retentionState);
    bucket.fileCount += 1;
    if (row.archivedKey) {
      bucket.archivedKey = row.archivedKey;
    }
    grouped.set(id, bucket);
  }

  return [...grouped.values()]
    .map((group) => {
      const ageMonths = monthsSincePeriodKey(group.periodKey, now);
      const policyPhase = retentionPhaseForAge(ageMonths);
      const state = dominantState(group.states);
      const archiveKey =
        group.archivedKey ??
        (state === "ARCHIVED"
          ? rawArchiveMinioKey(group.storeCode, group.periodKey)
          : null);
      return {
        storeCode: group.storeCode,
        storeName: group.storeName,
        periodKey: group.periodKey,
        ageMonths,
        policyPhase,
        policyLabel: retentionPhaseLabel(policyPhase),
        state,
        stateLabel: rawRetentionStateLabel(state),
        fileCount: group.fileCount,
        archiveKey,
        canDownload: state === "ARCHIVED" && archiveKey != null,
        canArchiveNow: state === "HOT" && group.fileCount > 0,
      };
    })
    .sort((a, b) => b.periodKey.localeCompare(a.periodKey));
}
