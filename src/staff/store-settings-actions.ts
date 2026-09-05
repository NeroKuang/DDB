"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import {
  parseDefaultCommissionRateFromForm,
  updateStoreDefaultCommissionRate,
} from "@/staff/store-settings";

export type StoreSettingsActionState = {
  ok: boolean;
  message: string;
};

export async function updateStoreDefaultCommissionRateAction(
  _prev: StoreSettingsActionState,
  formData: FormData
): Promise<StoreSettingsActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可修改門市預設。" };
  }
  try {
    const storeId = String(formData.get("storeId") ?? "").trim();
    const rate = parseDefaultCommissionRateFromForm(formData);
    await updateStoreDefaultCommissionRate({
      actorRole: "ADMIN",
      storeId,
      rate,
    });
    revalidatePath("/staff");
    return { ok: true, message: `已更新新進店員預設業績成數為 ${rate}。` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
