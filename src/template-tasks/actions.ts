"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import {
  deleteTemplateTask,
  parseTiersText,
  upsertTemplateTask,
} from "@/template-tasks/manage";

export type TemplateTaskActionState = {
  ok: boolean;
  message: string;
};

export async function saveTemplateTaskAction(
  _prev: TemplateTaskActionState,
  formData: FormData
): Promise<TemplateTaskActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以設定模板任務。" };
  }
  const storeId = String(formData.get("storeId") ?? "").trim();
  const itemName = String(formData.get("itemName") ?? "");
  const amountRaw = String(formData.get("amountPerClick") ?? "").trim();
  const amountPerClick = amountRaw === "" ? 0 : Number(amountRaw);
  const tiersText = String(formData.get("tiersText") ?? "");
  try {
    const tiers = parseTiersText(tiersText);
    await upsertTemplateTask({
      actorRole: "ADMIN",
      storeId,
      itemName,
      amountPerClick,
      tiers,
    });
    revalidatePath("/template-tasks");
    revalidatePath("/performance");
    return { ok: true, message: `已儲存「${itemName.trim()}」。` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message };
  }
}

export async function deleteTemplateTaskAction(
  _prev: TemplateTaskActionState,
  formData: FormData
): Promise<TemplateTaskActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以刪除模板任務。" };
  }
  const storeId = String(formData.get("storeId") ?? "").trim();
  const itemName = String(formData.get("itemName") ?? "");
  try {
    await deleteTemplateTask({
      actorRole: "ADMIN",
      storeId,
      itemName,
    });
    revalidatePath("/template-tasks");
    revalidatePath("/performance");
    return { ok: true, message: `已刪除「${itemName.trim()}」。` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message };
  }
}
