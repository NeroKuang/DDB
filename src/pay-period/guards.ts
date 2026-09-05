import { JULY_2026_PERIOD_KEY } from "@/lib/period-keys";
import { assertPayPeriodUnlocked } from "@/pay-period/state";

export async function assertPayPeriodUnlockedForWrite(
  storeId: string,
  periodKey: string
): Promise<void> {
  await assertPayPeriodUnlocked(storeId, periodKey);
}

/** Legacy guard for master-data writes when periodKey is not on the form. */
export async function assertJulyPayPeriodUnlocked(
  storeId: string,
  periodKey: string = JULY_2026_PERIOD_KEY
): Promise<void> {
  await assertPayPeriodUnlocked(storeId, periodKey);
}
