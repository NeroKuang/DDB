import { roundMoney } from "@/lib/money";
import type { StaffMaster, TemplateTask } from "@/compile/types";
import type { CheckoutNoteLine } from "@/import/parse-checkout";
import type { NoteAnalysisClick } from "@/import/parse-note-analysis";

/** Original from POS/import; stored is payroll-adopted (defaults to original until edited). */
export type MoneyPair = {
  original: number;
  stored: number;
};

export type PerformanceLineItem = {
  at: Date;
  nicknameUsed: string;
  orderer: string;
  amount: number;
};

export type GuestAnalysisRow = {
  orderer: string;
  amount: number;
  lineCount: number;
};

export type NoteListRow = {
  itemName: string;
  clicks: number;
  bonusPerClick: number;
  taskBonus: MoneyPair;
};

export type StaffPerformanceView = {
  primaryNickname: string;
  legalName: string;
  personalSales: MoneyPair;
  commission: MoneyPair;
  lineItems: PerformanceLineItem[];
  guestAnalysis: GuestAnalysisRow[];
  noteList: NoteListRow[];
  taskBonus: MoneyPair;
};

export type StoredPerformanceOverrides = {
  personalSales?: number;
  commission?: number;
  taskBonus?: number;
};

function nicknamesOf(staff: StaffMaster): string[] {
  return [staff.primaryNickname, ...staff.aliases];
}

function findStaff(
  staffList: StaffMaster[],
  nickname: string
): StaffMaster | undefined {
  return staffList.find((person) => nicknamesOf(person).includes(nickname));
}

function pair(original: number, stored?: number): MoneyPair {
  return {
    original,
    stored: stored === undefined ? original : stored,
  };
}

export function analyzeStaffPerformance(input: {
  staff: StaffMaster;
  checkoutLines: CheckoutNoteLine[];
  noteClicks: NoteAnalysisClick[];
  templateTasks?: TemplateTask[];
  storedOverrides?: StoredPerformanceOverrides;
}): StaffPerformanceView {
  const {
    staff,
    checkoutLines,
    noteClicks,
    templateTasks = [],
    storedOverrides,
  } = input;
  const mine = new Set(nicknamesOf(staff));
  const lineItems: PerformanceLineItem[] = [];
  let personalSalesOriginal = 0;

  for (const line of checkoutLines) {
    if (line.voided || !mine.has(line.nickname)) {
      continue;
    }
    personalSalesOriginal = roundMoney(personalSalesOriginal + line.amount);
    lineItems.push({
      at: line.at,
      nicknameUsed: line.nickname,
      orderer: line.orderer,
      amount: line.amount,
    });
  }
  lineItems.sort((a, b) => a.at.getTime() - b.at.getTime());

  const guestMap = new Map<string, GuestAnalysisRow>();
  for (const item of lineItems) {
    if (!item.orderer) {
      continue;
    }
    const existing = guestMap.get(item.orderer);
    if (existing) {
      existing.amount = roundMoney(existing.amount + item.amount);
      existing.lineCount += 1;
    } else {
      guestMap.set(item.orderer, {
        orderer: item.orderer,
        amount: item.amount,
        lineCount: 1,
      });
    }
  }
  const guestAnalysis = [...guestMap.values()].sort((a, b) =>
    a.orderer.localeCompare(b.orderer, "zh-Hant")
  );

  const clicksByItem = new Map<string, number>();
  for (const click of noteClicks) {
    if (!mine.has(click.nickname)) {
      continue;
    }
    clicksByItem.set(
      click.itemName,
      (clicksByItem.get(click.itemName) ?? 0) + click.clicks
    );
  }
  const bonusByItem = new Map(
    templateTasks.map((task) => [task.itemName, task.amountPerClick])
  );
  const noteList: NoteListRow[] = [...clicksByItem.entries()]
    .map(([itemName, clicks]) => {
      const bonusPerClick = bonusByItem.get(itemName) ?? 0;
      const taskBonusOriginal = roundMoney(clicks * bonusPerClick);
      return {
        itemName,
        clicks,
        bonusPerClick,
        taskBonus: pair(taskBonusOriginal),
      };
    })
    .sort((a, b) => a.itemName.localeCompare(b.itemName, "zh-Hant"));

  const taskBonusOriginal = roundMoney(
    noteList.reduce((sum, row) => sum + row.taskBonus.original, 0)
  );
  const commissionOriginal = roundMoney(
    personalSalesOriginal * staff.commissionRate
  );

  return {
    primaryNickname: staff.primaryNickname,
    legalName: staff.legalName,
    personalSales: pair(personalSalesOriginal, storedOverrides?.personalSales),
    commission: pair(commissionOriginal, storedOverrides?.commission),
    lineItems,
    guestAnalysis,
    noteList,
    taskBonus: pair(taskBonusOriginal, storedOverrides?.taskBonus),
  };
}

export function analyzeAllStaffPerformance(input: {
  allStaff: StaffMaster[];
  checkoutLines: CheckoutNoteLine[];
  noteClicks: NoteAnalysisClick[];
  templateTasks?: TemplateTask[];
}): StaffPerformanceView[] {
  return input.allStaff
    .filter((staff) => staff.kind === "regular" || staff.kind === "guest")
    .map((staff) =>
      analyzeStaffPerformance({
        staff,
        checkoutLines: input.checkoutLines,
        noteClicks: input.noteClicks,
        templateTasks: input.templateTasks,
      })
    )
    .filter(
      (view) =>
        view.personalSales.original > 0 ||
        view.lineItems.length > 0 ||
        view.noteList.length > 0
    )
    .sort((a, b) =>
      a.primaryNickname.localeCompare(b.primaryNickname, "zh-Hant")
    );
}

export function resolveStaffByNickname(
  staffList: StaffMaster[],
  nickname: string
): StaffMaster | undefined {
  return findStaff(staffList, nickname);
}
