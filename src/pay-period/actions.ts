"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { JULY_2026_PERIOD_KEY } from "@/ad-hoc-tasks/manage";
import { authOptions } from "@/lib/auth-options";
import { lockPayPeriod, unlockPayPeriod } from "@/pay-period/manage";

export type PayPeriodActionState = {
  ok: boolean;
  message: string;
};

export async function lockPayPeriodAction(
  _prev: PayPeriodActionState,
  formData: FormData
): Promise<PayPeriodActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以鎖定本期。" };
  }
  try {
    await lockPayPeriod({
      actorRole: "ADMIN",
      storeId: String(formData.get("storeId") ?? "").trim(),
      periodKey: JULY_2026_PERIOD_KEY,
    });
    revalidatePath("/payroll");
    revalidatePath("/performance");
    return { ok: true, message: "已鎖定本期；業績面與薪資報表已凍結。" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function unlockPayPeriodAction(
  _prev: PayPeriodActionState,
  formData: FormData
): Promise<PayPeriodActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以解鎖本期。" };
  }
  try {
    await unlockPayPeriod({
      actorRole: "ADMIN",
      storeId: String(formData.get("storeId") ?? "").trim(),
      periodKey: JULY_2026_PERIOD_KEY,
    });
    revalidatePath("/payroll");
    revalidatePath("/performance");
    return { ok: true, message: "已解鎖本期。" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
