"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { compilePayPeriodLive } from "@/compile/compile-for-period";
import { toUserFacingMessage } from "@/lib/user-facing-error";
import { logServerError } from "@/lib/log-server-error";
import { periodKeyFromFormData } from "@/lib/resolve-period-key";
import { assertPayPeriodUnlockedForWrite } from "@/pay-period/guards";
import { retainStoredOverrides } from "@/pay-row-stored/manage";

export type RecountActionState = {
  ok: boolean;
  message: string;
};

function keepKeysFromForm(formData: FormData): string[] {
  return formData
    .getAll("keep")
    .map((value) => String(value).trim())
    .filter(Boolean);
}

/**
 * Manual 重算：依表單 keep=staffId|venue|field 保留儲存值覆寫，其餘刪除，再編成。
 * 無覆寫或全保留時 keep 可為全部鍵；全部打回則 keep 為空。
 * 自動重算路徑不呼叫此 action（維持全保留）。
 */
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
    const mode = String(formData.get("retainMode") ?? "select").trim();
    let retention = { kept: 0, cleared: 0 };
    if (mode === "keep-all") {
      // Leave DB overrides untouched.
      retention = { kept: -1, cleared: 0 };
    } else {
      retention = await retainStoredOverrides({
        actorRole: "ADMIN",
        storeId,
        periodKey,
        keepKeys: keepKeysFromForm(formData),
      });
    }
    const compiled = await compilePayPeriodLive({ storeId, periodKey });
    revalidatePath("/payroll");
    revalidatePath("/performance");
    revalidatePath("/period-staff");
    revalidatePath("/staff");
    const retentionNote =
      retention.kept < 0
        ? "已存儲存值全保留"
        : retention.cleared === 0
          ? `保留 ${retention.kept} 筆儲存值覆寫`
          : `保留 ${retention.kept} 筆、清除 ${retention.cleared} 筆儲存值覆寫`;
    return {
      ok: true,
      message: `已重算 ${compiled.periodLabel} 原始數字（${compiled.result.payRows.length} 列；${retentionNote}）。`,
    };
  } catch (error) {
    logServerError("recountPayPeriodAction", error);
    return {
      ok: false,
      message: toUserFacingMessage(error, "重算失敗，請稍後再試。"),
    };
  }
}
