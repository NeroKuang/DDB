import type { StaffKind } from "@prisma/client";
import { effectiveCommissionRate } from "@/lib/commission-rate";
import { roundMoney } from "@/lib/money";
import {
  boundsForBusinessDateRange,
  enumerateBusinessDates,
} from "@/lib/business-day";

export type RangeCheckoutLine = {
  businessDate: string;
  nickname: string;
  amount: number;
  orderer: string;
  voided: boolean;
  occurredAt: Date;
};

export type RangePunchPair = {
  businessDate: string;
  nickname: string;
  hours: number;
  clockInAt: Date;
};

export type RangeStaffMaster = {
  primaryNickname: string;
  legalName: string;
  kind: StaffKind;
  aliases: string[];
  payKind: "hourly" | "monthly";
  hourlyRate: number;
  commissionRate: number | null;
  storeDefaultCommissionRate: number;
};

export type DayCoverageStatus = "ready" | "missing" | "running" | "failed";

export type DayCoverage = {
  businessDate: string;
  status: DayCoverageStatus;
  importRunId?: string;
  fetchedAt?: string;
  errorMessage?: string;
};

export type StaffRangeRow = {
  primaryNickname: string;
  legalName: string;
  kind: "regular" | "guest";
  sales: number;
  lineCount: number;
  commissionEstimate: number;
  hours: number | null;
  hourlyBasePayEstimate: number | null;
  perDay: { businessDate: string; sales: number; hours: number | null }[];
};

export type RangeViewResult = {
  query: {
    storeId: string;
    startBusinessDate: string;
    endBusinessDate: string;
  };
  bounds: { startIso: string; endIso: string };
  coverage: DayCoverage[];
  complete: boolean;
  rows: StaffRangeRow[];
  unmatchedNicknames: { nickname: string; amount: number }[];
};

export type AggregateBusinessDayRangeInput = {
  storeId: string;
  startBusinessDate: string;
  endBusinessDate: string;
  coverage: DayCoverage[];
  staff: RangeStaffMaster[];
  /** nickname → primaryNickname for the month of each attribution. */
  nicknameAttributions: ReadonlyMap<string, string>;
  checkoutLines: RangeCheckoutLine[];
  punchPairs: RangePunchPair[];
  /** When true, omit hours / hourly base from rows (personal). */
  personalView?: boolean;
};

function resolvePrimary(
  nickname: string,
  staff: RangeStaffMaster[],
  attributions: ReadonlyMap<string, string>
): string | null {
  const attributed = attributions.get(nickname);
  if (attributed) {
    return attributed;
  }
  for (const person of staff) {
    if (
      person.primaryNickname === nickname ||
      person.aliases.includes(nickname)
    ) {
      return person.primaryNickname;
    }
  }
  return null;
}

/**
 * Pure aggregator for 營業日區間檢視.
 * Does not touch PayPeriod payroll / stored values / note tasks.
 */
export function aggregateBusinessDayRange(
  input: AggregateBusinessDayRangeInput
): RangeViewResult {
  const dates = enumerateBusinessDates(
    input.startBusinessDate,
    input.endBusinessDate
  );
  const bounds = boundsForBusinessDateRange(
    input.startBusinessDate,
    input.endBusinessDate
  );
  const coverageByDate = new Map(
    input.coverage.map((day) => [day.businessDate, day])
  );
  const coverage: DayCoverage[] = dates.map(
    (businessDate) =>
      coverageByDate.get(businessDate) ?? {
        businessDate,
        status: "missing",
      }
  );
  const complete = coverage.every((day) => day.status === "ready");
  const anyMissingHours = coverage.some((day) => day.status !== "ready");

  type Acc = {
    sales: number;
    lineCount: number;
    hours: number;
    perDaySales: Map<string, number>;
    perDayHours: Map<string, number>;
  };
  const byStaff = new Map<string, Acc>();
  const ensure = (primary: string): Acc => {
    let acc = byStaff.get(primary);
    if (!acc) {
      acc = {
        sales: 0,
        lineCount: 0,
        hours: 0,
        perDaySales: new Map(),
        perDayHours: new Map(),
      };
      byStaff.set(primary, acc);
    }
    return acc;
  };

  const unmatched = new Map<string, number>();

  for (const line of input.checkoutLines) {
    if (!dates.includes(line.businessDate)) {
      continue;
    }
    if (line.voided) {
      continue;
    }
    const primary = resolvePrimary(
      line.nickname,
      input.staff,
      input.nicknameAttributions
    );
    if (!primary) {
      unmatched.set(
        line.nickname,
        (unmatched.get(line.nickname) ?? 0) + line.amount
      );
      continue;
    }
    const acc = ensure(primary);
    acc.sales += line.amount;
    acc.lineCount += 1;
    acc.perDaySales.set(
      line.businessDate,
      (acc.perDaySales.get(line.businessDate) ?? 0) + line.amount
    );
  }

  for (const pair of input.punchPairs) {
    if (!dates.includes(pair.businessDate)) {
      continue;
    }
    const primary = resolvePrimary(
      pair.nickname,
      input.staff,
      input.nicknameAttributions
    );
    if (!primary) {
      continue;
    }
    const acc = ensure(primary);
    acc.hours += pair.hours;
    acc.perDayHours.set(
      pair.businessDate,
      (acc.perDayHours.get(pair.businessDate) ?? 0) + pair.hours
    );
  }

  const staffByPrimary = new Map(
    input.staff.map((person) => [person.primaryNickname, person])
  );

  const rows: StaffRangeRow[] = [];
  for (const [primary, acc] of byStaff) {
    const master = staffByPrimary.get(primary);
    if (!master) {
      continue;
    }
    const rate = effectiveCommissionRate(
      master.commissionRate ?? master.storeDefaultCommissionRate
    );
    const hours = anyMissingHours ? null : acc.hours;
    const hourlyBasePayEstimate =
      input.personalView || master.payKind !== "hourly" || hours === null
        ? null
        : roundMoney(hours * master.hourlyRate);

    rows.push({
      primaryNickname: primary,
      legalName: master.legalName,
      kind: master.kind === "GUEST" ? "guest" : "regular",
      sales: roundMoney(acc.sales),
      lineCount: acc.lineCount,
      commissionEstimate: roundMoney(acc.sales * rate),
      hours: input.personalView ? null : hours,
      hourlyBasePayEstimate: input.personalView ? null : hourlyBasePayEstimate,
      perDay: dates.map((businessDate) => ({
        businessDate,
        sales: roundMoney(acc.perDaySales.get(businessDate) ?? 0),
        hours: input.personalView
          ? null
          : anyMissingHours
            ? null
            : (acc.perDayHours.get(businessDate) ?? 0),
      })),
    });
  }

  rows.sort(
    (a, b) =>
      b.sales - a.sales || a.primaryNickname.localeCompare(b.primaryNickname)
  );

  return {
    query: {
      storeId: input.storeId,
      startBusinessDate: input.startBusinessDate,
      endBusinessDate: input.endBusinessDate,
    },
    bounds,
    coverage,
    complete,
    rows,
    unmatchedNicknames: [...unmatched.entries()]
      .map(([nickname, amount]) => ({
        nickname,
        amount: roundMoney(amount),
      }))
      .sort((a, b) => b.amount - a.amount),
  };
}
