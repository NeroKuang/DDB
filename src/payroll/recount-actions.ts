"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { logServerError, toUserFacingMessage } from "@/lib/user-facing-error";
import { periodKeyFromFormData } from "@/lib/resolve-period-key";
import { assertPayPeriodUnlockedForWrite } from "@/pay-period/guards";

export type RecountActionState = {
  ok: boolean;
  message: string;
};

/** 重算 originals only; stored values in DB (when present) are preserved by compile. */
export async function recountPayPeriodAction(
  _prev: RecountActionState,
  formData: FormData
): Promise<RecountActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以重算本期。" };
  }
  const storeId = String(formData.get("storeId") ?? "").trim();
  if (!storeId) {
    return { ok: false, message: "門市缺失。" };
  }
  try {
    const periodKey = periodKeyFromFormData(formData);
    await assertPayPeriodUnlockedForWrite(storeId, periodKey);
    revalidatePath("/payroll");
    revalidatePath("/performance");
    return {
      ok: true,
      message: "已重算本期原始數字（未改動的儲存值維持不變）。",
    };
  } catch (error) {
    logServerError("recountPayPeriodAction", error);
    return {
      ok: false,
      message: toUserFacingMessage(error, "重算失敗，請稍後再試。"),
    };
  }
}
