import { roundMoney } from "@/lib/money";

export type LaborHealthInsuranceMode = "fixed" | "ratio";

export type LaborHealthInsuranceMaster = {
  mode: LaborHealthInsuranceMode;
  amount: number;
  ratio: number;
  carryOverMonthly: boolean;
};

export type LaborHealthInsurancePeriodOverride = {
  mode: LaborHealthInsuranceMode;
  amount: number;
  ratio: number;
};

/** Original 勞健保：固定額，或該列原始底薪 × 比例。 */
export function computeLaborHealthInsurance(
  master: LaborHealthInsuranceMaster,
  periodOverride: LaborHealthInsurancePeriodOverride | undefined,
  basePay: number
): number {
  if (!master.carryOverMonthly) {
    const source = periodOverride ?? {
      mode: "fixed" as const,
      amount: 0,
      ratio: 0,
    };
    if (source.mode === "ratio") {
      return roundMoney(basePay * source.ratio);
    }
    return roundMoney(source.amount);
  }
  if (master.mode === "ratio") {
    return roundMoney(basePay * master.ratio);
  }
  return roundMoney(master.amount);
}

export function parseLaborHealthMode(raw: string): LaborHealthInsuranceMode {
  return raw === "ratio" ? "ratio" : "fixed";
}
