import { roundMoney } from "@/lib/money";
import type { AdHocTask, StaffMaster, TemplateTask } from "@/compile/types";
import type { CheckoutNoteLine } from "@/import/parse-checkout";
import type { NoteAnalysisClick } from "@/import/parse-note-analysis";
import { computeTemplateTaskBonus } from "@/template-tasks/compute";

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
  perClickBonus: number;
  targetBonus: number;
  taskBonus: MoneyPair;
};

export type AdHocTaskRow = {
  name: string;
  amount: number;
};

export type StaffPerformanceView = {
  primaryNickname: string;
  legalName: string;
  personalSales: MoneyPair;
  commission: MoneyPair;
  lineItems: PerformanceLineItem[];
  guestAnalysis: GuestAnalysisRow[];
  noteList: NoteListRow[];
  adHocTasks: AdHocTaskRow[];
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
  adHocTasks?: AdHocTask[];
  storedOverrides?: StoredPerformanceOverrides;
}): StaffPerformanceView {
  const {
    staff,
    checkoutLines,
    noteClicks,
    templateTasks = [],
    adHocTasks = [],
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
  const taskByItem = new Map(
    templateTasks.map((task) => [task.itemName, task])
  );
  const noteList: NoteListRow[] = [...clicksByItem.entries()]
    .map(([itemName, clicks]) => {
      const task = taskByItem.get(itemName);
      const breakdown = computeTemplateTaskBonus(clicks, {
        amountPerClick: task?.amountPerClick ?? 0,
        tiers: task?.tiers ?? [],
      });
      return {
        itemName,
        clicks,
        bonusPerClick: task?.amountPerClick ?? 0,
        perClickBonus: breakdown.perClickBonus,
        targetBonus: breakdown.targetBonus,
        taskBonus: pair(breakdown.total),
      };
    })
    .sort((a, b) => a.itemName.localeCompare(b.itemName, "zh-Hant"));

  const noteTaskBonus = roundMoney(
    noteList.reduce((sum, row) => sum + row.taskBonus.original, 0)
  );
  const mineNicknames = nicknamesOf(staff);
  const adHocForStaff: AdHocTaskRow[] = adHocTasks
    .filter((task) => mineNicknames.includes(task.primaryNickname))
    .map((task) => ({ name: task.name, amount: task.amount }))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
  const adHocTotal = roundMoney(
    adHocForStaff.reduce((sum, row) => sum + row.amount, 0)
  );
  const taskBonusOriginal = roundMoney(noteTaskBonus + adHocTotal);
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
    adHocTasks: adHocForStaff,
    taskBonus: pair(taskBonusOriginal, storedOverrides?.taskBonus),
  };
}

export function analyzeAllStaffPerformance(input: {
  allStaff: StaffMaster[];
  checkoutLines: CheckoutNoteLine[];
  noteClicks: NoteAnalysisClick[];
  templateTasks?: TemplateTask[];
  adHocTasks?: AdHocTask[];
}): StaffPerformanceView[] {
  return input.allStaff
    .filter((staff) => staff.kind === "regular" || staff.kind === "guest")
    .map((staff) =>
      analyzeStaffPerformance({
        staff,
        checkoutLines: input.checkoutLines,
        noteClicks: input.noteClicks,
        templateTasks: input.templateTasks,
        adHocTasks: input.adHocTasks,
      })
    )
    .filter(
      (view) =>
        view.personalSales.original > 0 ||
        view.lineItems.length > 0 ||
        view.noteList.length > 0 ||
        view.adHocTasks.length > 0
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
