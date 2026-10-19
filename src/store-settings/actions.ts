"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import type { BuiltinRollupFieldKey } from "@/compile/default-rollups";
import { BUILTIN_ROLLUP_FIELD_KEYS } from "@/compile/default-rollups";
import type { Rollup } from "@/compile/types";
import { authOptions } from "@/lib/auth-options";
import { periodKeyFromFormData } from "@/lib/resolve-period-key";
import {
  archiveCustomSalaryItem,
  clearPeriodBusinessDayBounds,
  createCustomSalaryItem,
  updateCustomSalaryItem,
  updateDemeritUnitAmount,
  updatePeriodBusinessDayBounds,
  updateStoreRollups,
} from "@/store-settings/manage";

export type StoreSettingsActionState = {
  ok: boolean;
  message: string;
};

async function requireAdmin(): Promise<StoreSettingsActionState | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以修改門市設定。" };
  }
  return null;
}

function revalidateSettings(): void {
  revalidatePath("/store-settings");
  revalidatePath("/payroll");
  revalidatePath("/");
  revalidatePath("/performance");
}

export async function saveDemeritUnitAction(
  _prev: StoreSettingsActionState,
  formData: FormData
): Promise<StoreSettingsActionState> {
  const gate = await requireAdmin();
  if (gate) {
    return gate;
  }
  try {
    const storeId = String(formData.get("storeId") ?? "").trim();
    const demeritUnitAmount = Number(formData.get("demeritUnitAmount"));
    await updateDemeritUnitAmount({
      actorRole: "ADMIN",
      storeId,
      demeritUnitAmount,
    });
    revalidateSettings();
    return { ok: true, message: "已儲存單點金額。" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function saveRollupsAction(
  _prev: StoreSettingsActionState,
  formData: FormData
): Promise<StoreSettingsActionState> {
  const gate = await requireAdmin();
  if (gate) {
    return gate;
  }
  try {
    const storeId = String(formData.get("storeId") ?? "").trim();
    const rollups: Partial<Record<BuiltinRollupFieldKey, Rollup>> = {};
    for (const key of BUILTIN_ROLLUP_FIELD_KEYS) {
      const value = String(formData.get(`rollup_${key}`) ?? "").trim();
      if (value) {
        rollups[key] = value as Rollup;
      }
    }
    await updateStoreRollups({ actorRole: "ADMIN", storeId, rollups });
    revalidateSettings();
    return { ok: true, message: "已儲存加總歸屬。" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function createCustomItemAction(
  _prev: StoreSettingsActionState,
  formData: FormData
): Promise<StoreSettingsActionState> {
  const gate = await requireAdmin();
  if (gate) {
    return gate;
  }
  try {
    const storeId = String(formData.get("storeId") ?? "").trim();
    await createCustomSalaryItem({
      actorRole: "ADMIN",
      storeId,
      name: String(formData.get("name") ?? ""),
      rollup: String(formData.get("rollup") ?? "addToMonthlyPay") as Rollup,
    });
    revalidateSettings();
    return { ok: true, message: "已新增自訂薪資項目。" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function updateCustomItemAction(
  _prev: StoreSettingsActionState,
  formData: FormData
): Promise<StoreSettingsActionState> {
  const gate = await requireAdmin();
  if (gate) {
    return gate;
  }
  try {
    const storeId = String(formData.get("storeId") ?? "").trim();
    await updateCustomSalaryItem({
      actorRole: "ADMIN",
      storeId,
      id: String(formData.get("id") ?? ""),
      name: String(formData.get("name") ?? ""),
      rollup: String(formData.get("rollup") ?? "addToMonthlyPay") as Rollup,
    });
    revalidateSettings();
    return { ok: true, message: "已更新自訂薪資項目。" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function archiveCustomItemAction(
  _prev: StoreSettingsActionState,
  formData: FormData
): Promise<StoreSettingsActionState> {
  const gate = await requireAdmin();
  if (gate) {
    return gate;
  }
  try {
    const storeId = String(formData.get("storeId") ?? "").trim();
    await archiveCustomSalaryItem({
      actorRole: "ADMIN",
      storeId,
      id: String(formData.get("id") ?? ""),
    });
    revalidateSettings();
    return { ok: true, message: "已封存自訂薪資項目。" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function savePeriodBoundsAction(
  _prev: StoreSettingsActionState,
  formData: FormData
): Promise<StoreSettingsActionState> {
  const gate = await requireAdmin();
  if (gate) {
    return gate;
  }
  try {
    const storeId = String(formData.get("storeId") ?? "").trim();
    const periodKey = periodKeyFromFormData(formData);
    const reset = String(formData.get("reset") ?? "") === "1";
    if (reset) {
      await clearPeriodBusinessDayBounds({
        actorRole: "ADMIN",
        storeId,
        periodKey,
      });
      revalidateSettings();
      return { ok: true, message: "已恢復日曆月預設營業日起訖。" };
    }
    await updatePeriodBusinessDayBounds({
      actorRole: "ADMIN",
      storeId,
      periodKey,
      startIso: String(formData.get("startIso") ?? ""),
      endIso: String(formData.get("endIso") ?? ""),
    });
    revalidateSettings();
    return { ok: true, message: "已儲存本期營業日起訖。" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
