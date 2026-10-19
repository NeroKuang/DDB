export type Venue = "frontOfHouse" | "backOfHouse";
export type StaffKind = "regular" | "guest";
export type PayKind = "hourly" | "monthly";
export type Rollup =
  "none" | "addToMonthlyPay" | "addToNetPay" | "subtractFromNetPay";

export type StaffMaster = {
  legalName: string;
  primaryNickname: string;
  aliases: string[];
  title: string;
  kind: StaffKind;
  payKind: PayKind;
  hourlyRate: number;
  monthlyPay: number;
  commissionRate: number;
  targetBonusAmount: number;
  laborHealthInsuranceAmount: number;
  laborHealthInsuranceMode: "fixed" | "ratio";
  laborHealthInsuranceRatio: number;
  laborHealthInsuranceCarryOverMonthly: boolean;
  payNote: string;
};

export type RowManuals = {
  demerits: number;
  overtimeWithHoliday: number;
  overtimeWithoutHoliday: number;
  allowance: number;
  allowanceNote: string;
  repayment: number;
  photoCommission: number;
};

export type PeriodStaffInput = {
  primaryNickname: string;
  addBackOfHouseRow: boolean;
  venueSalesSplit?: { frontOfHouse: number; backOfHouse: number };
  hoursSplit?: { frontOfHouse: number; backOfHouse: number };
  landInsuranceOn: Venue;
  landTargetOn: Venue;
  landMonthlyOn: Venue;
  landTaskBonusOn: Venue;
  payTargetBonus: boolean;
  perRow: Partial<Record<Venue, RowManuals>>;
  laborHealthInsuranceMode?: "fixed" | "ratio";
  laborHealthInsuranceAmount?: number;
  laborHealthInsuranceRatio?: number;
};

export type TemplateTask = {
  itemName: string;
  amountPerClick: number;
  /** Cumulative 任務達標 tiers (minClicks → flat bonus when clicks meet threshold). */
  tiers: { minClicks: number; bonusAmount: number }[];
};

export type AdHocTask = {
  primaryNickname: string;
  name: string;
  storedAmount: number;
  /** When set, only confirmed rows count toward 任務獎金. */
  confirmed?: boolean;
};

export type CustomSalaryItemDef = {
  id: string;
  name: string;
  rollup: Rollup;
};

export type ShopInputs = {
  demeritUnitAmount: number;
  staff: StaffMaster[];
  periodStaff: PeriodStaffInput[];
  templateTasks: TemplateTask[];
  adHocTasks: AdHocTask[];
  /** Partial overrides merged onto DEFAULT_ROLLUPS. */
  rollups: Record<string, Rollup>;
  /** Admin-defined items; original always 0. */
  customSalaryItems: CustomSalaryItemDef[];
};

export type PayRowCustomCell = {
  id: string;
  name: string;
  original: number;
  stored: number;
};

export type PayRowOriginals = {
  hours: number;
  basePay: number;
  sales: number;
  commission: number;
  targetBonus: number;
  taskBonus: number;
  allowance: number;
  demerits: number;
  deduction: number;
  overtimeWithHoliday: number;
  overtimeWithoutHoliday: number;
  repayment: number;
  photoCommission: number;
  laborHealthInsurance: number;
  monthlyPay: number;
  netPay: number;
};

export type PayRow = {
  legalName: string;
  primaryNickname: string;
  title: string;
  kind: StaffKind;
  venue: Venue;
  payNote: string;
  allowanceNote: string;
  original: PayRowOriginals;
  stored: PayRowOriginals;
  customItems: PayRowCustomCell[];
};

export type CompileResult = {
  payRows: PayRow[];
  unmatchedNicknames: { nickname: string; amount: number }[];
  blockingUnmatchedNicknames: { nickname: string; amount: number }[];
  unmatchedClicks: { itemName: string; nickname: string; clicks: number }[];
  lockEligible: boolean;
  requiredImportsComplete: boolean;
};
