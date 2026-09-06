import { effectiveCommissionRate } from "@/lib/commission-rate";
import { roundMoney } from "@/lib/money";
import type { AdHocTask, StaffMaster, TemplateTask } from "@/compile/types";
import type { CheckoutNoteLine } from "@/import/parse-checkout";
import type { NoteAnalysisClick } from "@/import/parse-note-analysis";
import type { PosItemCatalogEntry } from "@/pos-items/manage";
import { isGiftItemName } from "@/pos-items/gift-item";
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

/** Aggregated checkout 業績注記 by 訂購人（含無訂購人，orderer === ""）. */
export type SalesStatRow = {
  orderer: string;
  amount: number;
  lineCount: number;
};

/** @deprecated Prefer SalesStatRow; kept for older call sites. */
export type GuestAnalysisRow = SalesStatRow;

export type NoteListRow = {
  itemName: string;
  clicks: number;
  /** POS 單價（外層累計加減價額 ÷ 全店點選數）. */
  unitPrice: number;
  /** iCHEF 兌換／贈送品：售價 0 為正常。 */
  isGift?: boolean;
  /** 非贈送品但售價未設定。 */
  missingPrice?: boolean;
  /** 該店員此品項總賣出（點選數 × 售價）. */
  totalSold: number;
  /** 常態抽成：總賣出 × 店員業績成數（與結帳業績獎金同一比例）. */
  baseCommission: number;
  /** 模板任務：單筆額外獎金（點選 × Admin 設定，與 POS 售價無關）. */
  perClickBonus: number;
  targetBonus: number;
  taskBonus: MoneyPair;
};

export type AdHocTaskRow = {
  name: string;
  storedAmount: number;
  confirmed: boolean;
};

export type StaffPerformanceView = {
  primaryNickname: string;
  legalName: string;
  personalSales: MoneyPair;
  commission: MoneyPair;
  lineItems: PerformanceLineItem[];
  /** 銷售統計：依訂購人彙總，含無訂購人. */
  salesStats: SalesStatRow[];
  /**
   * Subset of salesStats with non-empty 訂購人（舊「客人分析」）.
   * Prefer salesStats on new screens.
   */
  guestAnalysis: SalesStatRow[];
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

function lineBelongsToStaff(
  lineNickname: string,
  staff: StaffMaster,
  periodNicknameAttributions: ReadonlyMap<string, string>
): boolean {
  const attributed = periodNicknameAttributions.get(lineNickname);
  if (attributed) {
    return attributed === staff.primaryNickname;
  }
  return nicknamesOf(staff).includes(lineNickname);
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
  itemUnitPrices?: ReadonlyMap<string, number>;
  posItemCatalog?: ReadonlyMap<string, PosItemCatalogEntry>;
  periodNicknameAttributions?: ReadonlyMap<string, string>;
  templateTasks?: TemplateTask[];
  adHocTasks?: AdHocTask[];
  storedOverrides?: StoredPerformanceOverrides;
}): StaffPerformanceView {
  const {
    staff,
    checkoutLines,
    noteClicks,
    itemUnitPrices = new Map(),
    posItemCatalog = new Map(),
    periodNicknameAttributions = new Map(),
    templateTasks = [],
    adHocTasks = [],
    storedOverrides,
  } = input;

  const lineItems: PerformanceLineItem[] = [];
  let personalSalesOriginal = 0;

  for (const line of checkoutLines) {
    if (
      line.voided ||
      !lineBelongsToStaff(line.nickname, staff, periodNicknameAttributions)
    ) {
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

  const salesMap = new Map<string, SalesStatRow>();
  for (const item of lineItems) {
    const key = item.orderer;
    const existing = salesMap.get(key);
    if (existing) {
      existing.amount = roundMoney(existing.amount + item.amount);
      existing.lineCount += 1;
    } else {
      salesMap.set(key, {
        orderer: item.orderer,
        amount: item.amount,
        lineCount: 1,
      });
    }
  }
  const salesStats = [...salesMap.values()].sort((a, b) => {
    if (!a.orderer && b.orderer) {
      return -1;
    }
    if (a.orderer && !b.orderer) {
      return 1;
    }
    return a.orderer.localeCompare(b.orderer, "zh-Hant");
  });
  const guestAnalysis = salesStats.filter((row) => row.orderer.length > 0);

  const clicksByItem = new Map<string, number>();
  for (const click of noteClicks) {
    if (
      !lineBelongsToStaff(click.nickname, staff, periodNicknameAttributions)
    ) {
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
  const commissionRate = effectiveCommissionRate(staff.commissionRate);
  const noteList: NoteListRow[] = [...clicksByItem.entries()]
    .map(([itemName, clicks]) => {
      const task = taskByItem.get(itemName);
      const breakdown = computeTemplateTaskBonus(clicks, {
        amountPerClick: task?.amountPerClick ?? 0,
        tiers: task?.tiers ?? [],
      });
      const catalogEntry = posItemCatalog.get(itemName);
      const unitPrice =
        catalogEntry?.unitPrice ?? itemUnitPrices.get(itemName) ?? 0;
      const isGift = catalogEntry?.isGift ?? isGiftItemName(itemName);
      const missingPrice = unitPrice === 0 && !isGift && clicks > 0;
      const totalSold = roundMoney(clicks * unitPrice);
      const baseCommission = roundMoney(totalSold * commissionRate);
      return {
        itemName,
        clicks,
        unitPrice,
        isGift,
        missingPrice,
        totalSold,
        baseCommission,
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
    .map((task) => ({
      name: task.name,
      storedAmount: task.storedAmount,
      confirmed: task.confirmed ?? true,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
  const adHocTotal = roundMoney(
    adHocForStaff
      .filter((row) => row.confirmed)
      .reduce((sum, row) => sum + row.storedAmount, 0)
  );
  const taskBonusOriginal = roundMoney(noteTaskBonus + adHocTotal);
  const commissionOriginal = roundMoney(
    personalSalesOriginal * effectiveCommissionRate(staff.commissionRate)
  );

  return {
    primaryNickname: staff.primaryNickname,
    legalName: staff.legalName,
    personalSales: pair(personalSalesOriginal, storedOverrides?.personalSales),
    commission: pair(commissionOriginal, storedOverrides?.commission),
    lineItems,
    salesStats,
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
  itemUnitPrices?: ReadonlyMap<string, number>;
  posItemCatalog?: ReadonlyMap<string, PosItemCatalogEntry>;
  periodNicknameAttributions?: ReadonlyMap<string, string>;
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
        itemUnitPrices: input.itemUnitPrices,
        posItemCatalog: input.posItemCatalog,
        periodNicknameAttributions: input.periodNicknameAttributions,
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
  nickname: string,
  periodNicknameAttributions: ReadonlyMap<string, string> = new Map()
): StaffMaster | undefined {
  const attributed = periodNicknameAttributions.get(nickname);
  if (attributed) {
    return staffList.find((person) => person.primaryNickname === attributed);
  }
  return staffList.find((person) => nicknamesOf(person).includes(nickname));
}
