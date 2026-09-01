"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import {
  confirmAdHocTask,
  createAdHocTask,
  deleteAdHocTask,
  unconfirmAdHocTask,
  updateAdHocTaskStoredAmount,
} from "@/ad-hoc-tasks/manage";
import { authOptions } from "@/lib/auth-options";

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
    await createAdHocTask({
      actorRole: "ADMIN",
      storeId: String(formData.get("storeId") ?? "").trim(),
      staffId: String(formData.get("staffId") ?? "").trim(),
      periodKey: String(formData.get("periodKey") ?? "").trim(),
      name: String(formData.get("name") ?? ""),
    });
    revalidatePath("/ad-hoc-tasks");
    revalidatePath("/performance");
    revalidatePath("/payroll");
    return { ok: true, message: "已新增追加任務。" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message };
  }
}

export async function updateAdHocStoredAmountAction(
  _prev: AdHocTaskActionState,
  formData: FormData
): Promise<AdHocTaskActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以修改儲存值。" };
  }
  try {
    const storedAmount = Number(
      String(formData.get("storedAmount") ?? "").trim()
    );
    await updateAdHocTaskStoredAmount({
      actorRole: "ADMIN",
      id: String(formData.get("id") ?? "").trim(),
      storedAmount,
    });
    revalidatePath("/ad-hoc-tasks");
    revalidatePath("/performance");
    revalidatePath("/payroll");
    return { ok: true, message: "已更新儲存值。" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message };
  }
}

export async function confirmAdHocTaskAction(
  _prev: AdHocTaskActionState,
  formData: FormData
): Promise<AdHocTaskActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以確認派發。" };
  }
  try {
    await confirmAdHocTask({
      actorRole: "ADMIN",
      id: String(formData.get("id") ?? "").trim(),
    });
    revalidatePath("/ad-hoc-tasks");
    revalidatePath("/performance");
    revalidatePath("/payroll");
    return { ok: true, message: "已確認派發。" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message };
  }
}

export async function unconfirmAdHocTaskAction(
  _prev: AdHocTaskActionState,
  formData: FormData
): Promise<AdHocTaskActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以取消確認。" };
  }
  try {
    await unconfirmAdHocTask({
      actorRole: "ADMIN",
      id: String(formData.get("id") ?? "").trim(),
    });
    revalidatePath("/ad-hoc-tasks");
    revalidatePath("/performance");
    revalidatePath("/payroll");
    return { ok: true, message: "已取消確認。" };
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
    revalidatePath("/payroll");
    return { ok: true, message: "已刪除追加任務。" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message };
  }
}
