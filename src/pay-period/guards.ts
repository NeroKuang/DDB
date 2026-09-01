import { JULY_2026_PERIOD_KEY } from "@/ad-hoc-tasks/manage";
import { assertPayPeriodUnlocked } from "@/pay-period/manage";

/** v1: payroll-affecting writes check the active 薪資期間 lock. */
export async function assertJulyPayPeriodUnlocked(
  storeId: string
): Promise<void> {
  await assertPayPeriodUnlocked(storeId, JULY_2026_PERIOD_KEY);
}
