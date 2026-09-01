"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { addStaffTitle, deleteStaffTitle } from "@/staff-titles/manage";

export type StaffTitleActionState = { ok: boolean; message: string };

export async function addStaffTitleAction(
  _prev: StaffTitleActionState,
  formData: FormData
): Promise<StaffTitleActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以新增職稱。" };
  }
  try {
    const storeId = String(formData.get("storeId") ?? "").trim();
    const label = String(formData.get("label") ?? "").trim();
    await addStaffTitle({
      actorRole: "ADMIN",
      storeId,
      label,
    });
    revalidatePath("/staff-titles");
    revalidatePath("/staff");
    return { ok: true, message: `已新增職稱：${label}` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function deleteStaffTitleAction(
  _prev: StaffTitleActionState,
  formData: FormData
): Promise<StaffTitleActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以刪除職稱。" };
  }
  try {
    const storeId = String(formData.get("storeId") ?? "").trim();
    const label = String(formData.get("label") ?? "").trim();
    await deleteStaffTitle({
      actorRole: "ADMIN",
      storeId,
      label,
    });
    revalidatePath("/staff-titles");
    return { ok: true, message: `已刪除職稱：${label}` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
