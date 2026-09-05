"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { toUserFacingMessage } from "@/lib/user-facing-error";
import { logServerError } from "@/lib/log-server-error";
import { periodKeyFromFormData } from "@/lib/resolve-period-key";
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
    const storeId = String(formData.get("storeId") ?? "").trim();
    if (!storeId) {
      return { ok: false, message: "門市缺失。" };
    }
    const periodKey = periodKeyFromFormData(formData);
    await lockPayPeriod({
      actorRole: "ADMIN",
      storeId,
      periodKey,
    });
    revalidatePath("/payroll");
    revalidatePath("/performance");
    revalidatePath("/");
    return { ok: true, message: "已鎖定本期；業績面與薪資報表已凍結。" };
  } catch (error) {
    logServerError("lockPayPeriodAction", error);
    return {
      ok: false,
      message: toUserFacingMessage(error, "無法鎖定本期，請稍後再試。"),
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
    const storeId = String(formData.get("storeId") ?? "").trim();
    if (!storeId) {
      return { ok: false, message: "門市缺失。" };
    }
    const periodKey = periodKeyFromFormData(formData);
    await unlockPayPeriod({
      actorRole: "ADMIN",
      storeId,
      periodKey,
    });
    revalidatePath("/payroll");
    revalidatePath("/performance");
    revalidatePath("/");
    return { ok: true, message: "已解鎖本期。" };
  } catch (error) {
    logServerError("unlockPayPeriodAction", error);
    return {
      ok: false,
      message: toUserFacingMessage(error, "無法解鎖本期，請稍後再試。"),
    };
  }
}
