import type { PeriodStaffInput } from "@/compile/types";

/** JSON persisted for one 店員 in a 薪資期間 (primaryNickname resolved via staffId). */
export type PeriodStaffSettingsJson = Omit<PeriodStaffInput, "primaryNickname">;

export const DEFAULT_PERIOD_STAFF_SETTINGS: PeriodStaffSettingsJson = {
  addBackOfHouseRow: false,
  landInsuranceOn: "frontOfHouse",
  landTargetOn: "frontOfHouse",
  landMonthlyOn: "frontOfHouse",
  landTaskBonusOn: "frontOfHouse",
  payTargetBonus: false,
  perRow: {},
};
