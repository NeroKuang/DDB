"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { createAdHocTask, deleteAdHocTask } from "@/ad-hoc-tasks/manage";

export type AdHocTaskActionState = {
  ok: boolean;
  message: string;
};

export async function createAdHocTaskAction(
  _prev: AdHocTaskActionState,
  formData: FormData
): Promise<AdHocTaskActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以新增追加任務。" };
  }
  try {
    const amount = Number(String(formData.get("amount") ?? "").trim());
    await createAdHocTask({
      actorRole: "ADMIN",
      storeId: String(formData.get("storeId") ?? "").trim(),
      staffId: String(formData.get("staffId") ?? "").trim(),
      periodKey: String(formData.get("periodKey") ?? "").trim(),
      name: String(formData.get("name") ?? ""),
      amount,
    });
    revalidatePath("/ad-hoc-tasks");
    revalidatePath("/performance");
    return { ok: true, message: "已新增追加任務。" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message };
  }
}

export async function deleteAdHocTaskAction(
  _prev: AdHocTaskActionState,
  formData: FormData
): Promise<AdHocTaskActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以刪除追加任務。" };
  }
  try {
    await deleteAdHocTask({
      actorRole: "ADMIN",
      id: String(formData.get("id") ?? "").trim(),
    });
    revalidatePath("/ad-hoc-tasks");
    revalidatePath("/performance");
    return { ok: true, message: "已刪除追加任務。" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message };
  }
}
