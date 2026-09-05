import {
  isValidPeriodKey,
  periodKeyDisplayLabel,
  rollingPeriodKeys,
} from "@/lib/pay-period-calendar";
import { prisma } from "@/lib/prisma";

export type PeriodOption = {
  periodKey: string;
  label: string;
  hasImport: boolean;
  locked: boolean;
};

/** Ensure assigned / URL period keys appear in staff guest selectors. */
export function mergePeriodOptions(
  options: PeriodOption[],
  ...extraKeys: Array<string | null | undefined>
): PeriodOption[] {
  const byKey = new Map(options.map((option) => [option.periodKey, option]));
  for (const raw of extraKeys) {
    const key = raw?.trim();
    if (!key || !isValidPeriodKey(key) || byKey.has(key)) {
      continue;
    }
    byKey.set(key, {
      periodKey: key,
      label: periodKeyDisplayLabel(key),
      hasImport: false,
      locked: false,
    });
  }
  return [...byKey.values()].sort((left, right) =>
    right.periodKey.localeCompare(left.periodKey)
  );
}

/** Selector options: rolling months + any extra keys already in DB. */
export async function listPeriodOptions(
  storeId: string
): Promise<PeriodOption[]> {
  const rows = await prisma.payPeriod.findMany({
    where: { storeId },
    select: {
      periodKey: true,
      lockedAt: true,
      activeImportRunId: true,
    },
  });
  const byKey = new Map(
    rows.map((row) => [
      row.periodKey,
      {
        hasImport: Boolean(row.activeImportRunId),
        locked: Boolean(row.lockedAt),
      },
    ])
  );

  const keys = new Set<string>(rollingPeriodKeys(24));
  for (const row of rows) {
    if (isValidPeriodKey(row.periodKey)) {
      keys.add(row.periodKey);
    }
  }

  return [...keys]
    .sort((left, right) => right.localeCompare(left))
    .map((periodKey) => {
      const meta = byKey.get(periodKey);
      return {
        periodKey,
        label: periodKeyDisplayLabel(periodKey),
        hasImport: meta?.hasImport ?? false,
        locked: meta?.locked ?? false,
      };
    });
}
