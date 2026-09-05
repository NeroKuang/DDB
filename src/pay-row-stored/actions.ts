"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import type { Venue } from "@/compile/types";
import { authOptions } from "@/lib/auth-options";
import { periodKeyFromFormData } from "@/lib/resolve-period-key";
import { upsertPayRowStored } from "@/pay-row-stored/manage";

export type PayRowStoredActionState = {
  ok: boolean;
  message: string;
};

const FIELD_NAMES = [
  "hours",
  "basePay",
  "sales",
  "commission",
  "targetBonus",
  "taskBonus",
  "allowance",
  "demerits",
  "deduction",
  "overtimeWithHoliday",
  "overtimeWithoutHoliday",
  "repayment",
  "photoCommission",
  "laborHealthInsurance",
  "monthlyPay",
  "netPay",
] as const;

export async function savePayRowStoredAction(
  _prev: PayRowStoredActionState,
  formData: FormData
): Promise<PayRowStoredActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以修改儲存值。" };
  }
  try {
    const storeId = String(formData.get("storeId") ?? "").trim();
    const staffId = String(formData.get("staffId") ?? "").trim();
    const venue = String(formData.get("venue") ?? "frontOfHouse") as Venue;
    const periodKey = periodKeyFromFormData(formData);
    const values: Partial<Record<(typeof FIELD_NAMES)[number], number>> = {};
    const clearFields: (typeof FIELD_NAMES)[number][] = [];
    for (const name of FIELD_NAMES) {
      if (!formData.has(name)) {
        continue;
      }
      const raw = String(formData.get(name) ?? "").trim();
      if (raw === "") {
        clearFields.push(name);
      } else {
        values[name] = Number(raw);
      }
    }
    await upsertPayRowStored({
      actorRole: "ADMIN",
      storeId,
      periodKey,
      staffId,
      venue,
      values,
      clearFields,
    });
    revalidatePath("/payroll");
    revalidatePath("/performance");
    return { ok: true, message: "已儲存薪資列儲存值。" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
