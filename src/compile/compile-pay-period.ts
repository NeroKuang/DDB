import { roundMoney } from "@/lib/money";
import type {
  CompileResult,
  PayRow,
  PayRowOriginals,
  PeriodStaffInput,
  Rollup,
  ShopInputs,
  StaffMaster,
  Venue,
} from "@/compile/types";
import type { CheckoutNoteLine } from "@/import/parse-checkout";
import type { NoteAnalysisClick } from "@/import/parse-note-analysis";
import type { PunchPair } from "@/import/parse-punches";
import { computeTemplateTaskBonus } from "@/template-tasks/compute";

const DEFAULT_MANUALS = {
  demerits: 0,
  overtimeWithHoliday: 0,
  overtimeWithoutHoliday: 0,
  allowance: 0,
  allowanceNote: "",
  repayment: 0,
  photoCommission: 0,
};

const DEFAULT_ROLLUPS: Record<string, Rollup> = {
  basePay: "addToMonthlyPay",
  commission: "addToMonthlyPay",
  targetBonus: "addToMonthlyPay",
  taskBonus: "addToMonthlyPay",
  allowance: "addToMonthlyPay",
  deduction: "subtractFromNetPay",
  laborHealthInsurance: "subtractFromNetPay",
  overtimeWithHoliday: "none",
  overtimeWithoutHoliday: "none",
  repayment: "none",
  photoCommission: "none",
};

export type CompilePayPeriodInput = {
  shop: ShopInputs;
  checkoutLines: CheckoutNoteLine[];
  punchPairs: PunchPair[];
  noteClicks: NoteAnalysisClick[];
  noteOuterComplete: boolean;
  savedStored?: Record<
    string,
    Partial<Record<Venue, Partial<PayRowOriginals>>>
  >;
};

function nicknamesOf(staff: StaffMaster): string[] {
  return [staff.primaryNickname, ...staff.aliases];
}

function findStaff(
  shop: ShopInputs,
  nickname: string
): StaffMaster | undefined {
  return shop.staff.find((person) => nicknamesOf(person).includes(nickname));
}

function periodInput(
  shop: ShopInputs,
  primaryNickname: string
): PeriodStaffInput {
  return (
    shop.periodStaff.find((row) => row.primaryNickname === primaryNickname) ?? {
      primaryNickname,
      addBackOfHouseRow: false,
      landInsuranceOn: "frontOfHouse",
      landTargetOn: "frontOfHouse",
      landMonthlyOn: "frontOfHouse",
      landTaskBonusOn: "frontOfHouse",
      payTargetBonus: false,
      perRow: {},
    }
  );
}

function venuesFor(input: PeriodStaffInput): Venue[] {
  return input.addBackOfHouseRow
    ? ["frontOfHouse", "backOfHouse"]
    : ["frontOfHouse"];
}

function splitAmount(
  total: number,
  venues: Venue[],
  specified?: { frontOfHouse: number; backOfHouse: number }
): Record<Venue, number> {
  if (venues.length === 1) {
    return { frontOfHouse: total, backOfHouse: 0 };
  }
  if (specified) {
    return specified;
  }
  return { frontOfHouse: total, backOfHouse: 0 };
}

function landAmount(total: number, venue: Venue, landOn: Venue): number {
  return venue === landOn ? total : 0;
}

function applyRollup(
  original: PayRowOriginals,
  rollups: Record<string, Rollup>
): { monthlyPay: number; netPay: number } {
  const merged = { ...DEFAULT_ROLLUPS, ...rollups };
  let monthlyPay = 0;
  let netAdjust = 0;
  const entries: [keyof PayRowOriginals, number][] = [
    ["basePay", original.basePay],
    ["commission", original.commission],
    ["targetBonus", original.targetBonus],
    ["taskBonus", original.taskBonus],
    ["allowance", original.allowance],
    ["deduction", original.deduction],
    ["laborHealthInsurance", original.laborHealthInsurance],
    ["repayment", original.repayment],
    ["photoCommission", original.photoCommission],
  ];
  for (const [key, value] of entries) {
    const how = merged[key] ?? "none";
    if (how === "addToMonthlyPay") {
      monthlyPay = roundMoney(monthlyPay + value);
    } else if (how === "addToNetPay") {
      netAdjust = roundMoney(netAdjust + value);
    } else if (how === "subtractFromNetPay") {
      netAdjust = roundMoney(netAdjust - value);
    }
  }
  return {
    monthlyPay,
    netPay: roundMoney(monthlyPay + netAdjust),
  };
}

export function compilePayPeriod(input: CompilePayPeriodInput): CompileResult {
  const {
    shop,
    checkoutLines,
    punchPairs,
    noteClicks,
    noteOuterComplete,
    savedStored,
  } = input;
  const unmatchedNicknames = new Map<string, number>();
  const sales = new Map<string, number>();
  const hours = new Map<string, number>();

  for (const line of checkoutLines) {
    if (line.voided) {
      continue;
    }
    const staff = findStaff(shop, line.nickname);
    if (!staff) {
      unmatchedNicknames.set(
        line.nickname,
        roundMoney((unmatchedNicknames.get(line.nickname) ?? 0) + line.amount)
      );
      continue;
    }
    sales.set(
      staff.primaryNickname,
      roundMoney((sales.get(staff.primaryNickname) ?? 0) + line.amount)
    );
  }

  for (const pair of punchPairs) {
    const staff = findStaff(shop, pair.nickname);
    if (!staff) {
      continue;
    }
    hours.set(
      staff.primaryNickname,
      (hours.get(staff.primaryNickname) ?? 0) + pair.hours
    );
  }

  const unmatchedClicks: CompileResult["unmatchedClicks"] = [];
  const clicksByStaffItem = new Map<string, number>();
  for (const click of noteClicks) {
    const staff = findStaff(shop, click.nickname);
    if (!staff) {
      unmatchedClicks.push({
        itemName: click.itemName,
        nickname: click.nickname,
        clicks: click.clicks,
      });
      continue;
    }
    const key = `${staff.primaryNickname}\t${click.itemName}`;
    clicksByStaffItem.set(
      key,
      (clicksByStaffItem.get(key) ?? 0) + click.clicks
    );
  }

  const payRows: PayRow[] = [];
  for (const staff of shop.staff) {
    const period = periodInput(shop, staff.primaryNickname);
    const venues = venuesFor(period);
    const personalSales = sales.get(staff.primaryNickname) ?? 0;
    const personalHours = hours.get(staff.primaryNickname) ?? 0;
    const salesByVenue = splitAmount(
      personalSales,
      venues,
      period.venueSalesSplit
    );
    const hoursByVenue = splitAmount(personalHours, venues, period.hoursSplit);

    let taskTotal = 0;
    for (const task of shop.templateTasks) {
      const clicks =
        clicksByStaffItem.get(`${staff.primaryNickname}\t${task.itemName}`) ??
        0;
      taskTotal = roundMoney(
        taskTotal +
          computeTemplateTaskBonus(clicks, {
            amountPerClick: task.amountPerClick,
            tiers: task.tiers ?? [],
          }).total
      );
    }
    for (const task of shop.adHocTasks) {
      if (task.primaryNickname === staff.primaryNickname) {
        taskTotal = roundMoney(taskTotal + task.amount);
      }
    }

    for (const venue of venues) {
      const manuals = {
        ...DEFAULT_MANUALS,
        ...period.perRow[venue],
      };
      const rowHours = hoursByVenue[venue];
      const rowSales = salesByVenue[venue];
      const basePay =
        staff.payKind === "monthly"
          ? landAmount(staff.monthlyPay, venue, period.landMonthlyOn)
          : roundMoney(staff.hourlyRate * rowHours);
      const original: PayRowOriginals = {
        hours: rowHours,
        basePay,
        sales: rowSales,
        commission: roundMoney(rowSales * staff.commissionRate),
        targetBonus: period.payTargetBonus
          ? landAmount(staff.targetBonusAmount, venue, period.landTargetOn)
          : 0,
        taskBonus: landAmount(taskTotal, venue, period.landTaskBonusOn),
        allowance: 0,
        demerits: 0,
        deduction: roundMoney(manuals.demerits * shop.demeritUnitAmount),
        overtimeWithHoliday: 0,
        overtimeWithoutHoliday: 0,
        repayment: 0,
        photoCommission: 0,
        laborHealthInsurance: landAmount(
          staff.laborHealthInsuranceAmount,
          venue,
          period.landInsuranceOn
        ),
        monthlyPay: 0,
        netPay: 0,
      };
      const saved = savedStored?.[staff.primaryNickname]?.[venue] ?? {};
      const storedLine: PayRowOriginals = {
        ...original,
        allowance: manuals.allowance,
        demerits: manuals.demerits,
        overtimeWithHoliday: manuals.overtimeWithHoliday,
        overtimeWithoutHoliday: manuals.overtimeWithoutHoliday,
        repayment: manuals.repayment,
        photoCommission: manuals.photoCommission,
        deduction: roundMoney(manuals.demerits * shop.demeritUnitAmount),
        ...saved,
      };
      const rolled = applyRollup(storedLine, shop.rollups);
      original.monthlyPay = rolled.monthlyPay;
      original.netPay = rolled.netPay;
      storedLine.monthlyPay = saved.monthlyPay ?? original.monthlyPay;
      storedLine.netPay = saved.netPay ?? original.netPay;
      payRows.push({
        legalName: staff.legalName,
        primaryNickname: staff.primaryNickname,
        title: staff.title,
        kind: staff.kind,
        venue,
        payNote: staff.payNote,
        allowanceNote: manuals.allowanceNote,
        original,
        stored: storedLine,
      });
    }
  }

  const unmatchedList = [...unmatchedNicknames.entries()]
    .map(([nickname, amount]) => ({ nickname, amount }))
    .sort((a, b) => a.nickname.localeCompare(b.nickname, "zh-Hant"));

  return {
    payRows,
    unmatchedNicknames: unmatchedList,
    unmatchedClicks,
    requiredImportsComplete: noteOuterComplete,
    lockEligible: unmatchedList.length === 0 && noteOuterComplete,
  };
}
