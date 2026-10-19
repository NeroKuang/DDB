import {
  aggregateBusinessDayRange,
  type DayCoverage,
  type RangeViewResult,
} from "@/range/aggregate-business-day-range";
import { businessDateOf, enumerateBusinessDates } from "@/lib/business-day";
import { prisma } from "@/lib/prisma";
import { MAX_RANGE_BUSINESS_DAYS } from "@/range/daily-fetch-manage";

export type LoadRangeViewInput = {
  storeId: string;
  startBusinessDate: string;
  endBusinessDate: string;
  /** Restrict to one primary nickname (personal). */
  onlyPrimaryNickname?: string;
  personalView?: boolean;
};

function defaultRange(now = new Date()): {
  startBusinessDate: string;
  endBusinessDate: string;
} {
  const endBusinessDate = businessDateOf(now);
  const startAt = new Date(`${endBusinessDate}T12:00:00+08:00`);
  startAt.setUTCDate(startAt.getUTCDate() - 6);
  const startBusinessDate = startAt.toLocaleDateString("en-CA", {
    timeZone: "Asia/Taipei",
  });
  return { startBusinessDate, endBusinessDate };
}

export function resolveRangeQueryParams(input: {
  start?: string;
  end?: string;
  now?: Date;
}): { startBusinessDate: string; endBusinessDate: string } {
  if (!input.start || !input.end) {
    return defaultRange(input.now);
  }
  return {
    startBusinessDate: input.start,
    endBusinessDate: input.end,
  };
}

export async function loadRangeView(
  input: LoadRangeViewInput
): Promise<RangeViewResult> {
  const dates = enumerateBusinessDates(
    input.startBusinessDate,
    input.endBusinessDate
  );
  if (dates.length > MAX_RANGE_BUSINESS_DAYS) {
    throw new Error(`一次最多查詢 ${MAX_RANGE_BUSINESS_DAYS} 個營業日`);
  }

  const dayRows = await prisma.businessDayImport.findMany({
    where: {
      storeId: input.storeId,
      businessDate: { in: dates },
    },
  });
  const byDate = new Map(dayRows.map((row) => [row.businessDate, row]));

  const coverage: DayCoverage[] = dates.map((businessDate) => {
    const row = byDate.get(businessDate);
    if (!row) {
      return { businessDate, status: "missing" };
    }
    if (row.fetchStatus === "RUNNING") {
      return {
        businessDate,
        status: "running",
        errorMessage: row.fetchErrorMessage ?? undefined,
      };
    }
    if (row.fetchStatus === "FAILED") {
      return {
        businessDate,
        status: "failed",
        errorMessage: row.fetchErrorMessage ?? undefined,
      };
    }
    if (row.fetchStatus === "SUCCEEDED" && row.activeImportRunId) {
      return {
        businessDate,
        status: "ready",
        importRunId: row.activeImportRunId,
        fetchedAt: row.fetchFinishedAt?.toISOString(),
      };
    }
    return { businessDate, status: "missing" };
  });

  const readyRunIds = coverage
    .filter((day) => day.status === "ready" && day.importRunId)
    .map((day) => day.importRunId!);

  const runs =
    readyRunIds.length === 0
      ? []
      : await prisma.importRun.findMany({
          where: {
            id: { in: readyRunIds },
            kind: "BUSINESS_DAY",
            status: "SUCCEEDED",
          },
          include: {
            checkoutLines: true,
            punchPairs: true,
          },
        });

  const runById = new Map(runs.map((run) => [run.id, run]));

  const checkoutLines = [];
  const punchPairs = [];
  for (const day of coverage) {
    if (day.status !== "ready" || !day.importRunId) {
      continue;
    }
    const run = runById.get(day.importRunId);
    if (!run || !run.businessDate) {
      continue;
    }
    for (const line of run.checkoutLines) {
      checkoutLines.push({
        businessDate: run.businessDate,
        nickname: line.nickname,
        amount: line.amount,
        orderer: line.orderer,
        voided: line.voided,
        occurredAt: line.occurredAt,
      });
    }
    for (const pair of run.punchPairs) {
      if (!pair.clockInAt) {
        continue;
      }
      punchPairs.push({
        businessDate: run.businessDate,
        nickname: pair.nickname,
        hours: pair.hours,
        clockInAt: pair.clockInAt,
      });
    }
  }

  const store = await prisma.store.findUniqueOrThrow({
    where: { id: input.storeId },
    select: {
      defaultCommissionRate: true,
      staff: {
        include: { aliases: true },
      },
    },
  });

  let staff = store.staff.map((person) => ({
    primaryNickname: person.primaryNickname,
    legalName: person.legalName,
    kind: person.kind,
    aliases: person.aliases.map((alias) => alias.nickname),
    payKind:
      person.payKind === "MONTHLY" ? ("monthly" as const) : ("hourly" as const),
    hourlyRate: person.hourlyRate,
    commissionRate: person.commissionRate,
    storeDefaultCommissionRate: store.defaultCommissionRate,
  }));

  if (input.onlyPrimaryNickname) {
    staff = staff.filter(
      (person) => person.primaryNickname === input.onlyPrimaryNickname
    );
  }

  const periodKeys = [...new Set(dates.map((d) => d.slice(0, 7)))];
  const resolutions = await prisma.payPeriodUnmatchedResolution.findMany({
    where: {
      payPeriod: {
        storeId: input.storeId,
        periodKey: { in: periodKeys },
      },
      kind: "ATTRIBUTE_PERIOD",
      targetStaffId: { not: null },
    },
    include: {
      targetStaff: { select: { primaryNickname: true } },
    },
  });
  const nicknameAttributions = new Map<string, string>();
  for (const resolution of resolutions) {
    if (!resolution.targetStaff) {
      continue;
    }
    nicknameAttributions.set(
      resolution.nickname,
      resolution.targetStaff.primaryNickname
    );
  }

  return aggregateBusinessDayRange({
    storeId: input.storeId,
    startBusinessDate: input.startBusinessDate,
    endBusinessDate: input.endBusinessDate,
    coverage,
    staff,
    nicknameAttributions,
    checkoutLines,
    punchPairs,
    personalView: input.personalView,
  });
}
