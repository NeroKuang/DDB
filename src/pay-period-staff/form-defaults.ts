import type { PeriodStaffRecord } from "@/pay-period-staff/manage";

export function periodStaffFormDefaults(record: PeriodStaffRecord) {
  const s = record.settings;
  const front = s.perRow.frontOfHouse;
  const back = s.perRow.backOfHouse;
  return {
    addBackOfHouseRow: s.addBackOfHouseRow,
    payTargetBonus: s.payTargetBonus,
    landInsuranceOn: s.landInsuranceOn,
    landTargetOn: s.landTargetOn,
    landMonthlyOn: s.landMonthlyOn,
    landTaskBonusOn: s.landTaskBonusOn,
    venueSalesFront: s.venueSalesSplit?.frontOfHouse ?? 0,
    venueSalesBack: s.venueSalesSplit?.backOfHouse ?? 0,
    hoursFront: s.hoursSplit?.frontOfHouse ?? 0,
    hoursBack: s.hoursSplit?.backOfHouse ?? 0,
    frontDemerits: front?.demerits ?? 0,
    frontOtHoliday: front?.overtimeWithHoliday ?? 0,
    frontOtWeekday: front?.overtimeWithoutHoliday ?? 0,
    frontAllowance: front?.allowance ?? 0,
    frontAllowanceNote: front?.allowanceNote ?? "",
    frontRepayment: front?.repayment ?? 0,
    frontPhotoCommission: front?.photoCommission ?? 0,
    backDemerits: back?.demerits ?? 0,
    backOtHoliday: back?.overtimeWithHoliday ?? 0,
    backOtWeekday: back?.overtimeWithoutHoliday ?? 0,
    backAllowance: back?.allowance ?? 0,
    backAllowanceNote: back?.allowanceNote ?? "",
    backRepayment: back?.repayment ?? 0,
    backPhotoCommission: back?.photoCommission ?? 0,
    laborHealthInsuranceMode: s.laborHealthInsuranceMode ?? "fixed",
    laborHealthInsuranceAmount: s.laborHealthInsuranceAmount ?? 0,
    laborHealthInsuranceRatio: s.laborHealthInsuranceRatio ?? 0,
  };
}
