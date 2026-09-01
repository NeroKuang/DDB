"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import {
  deleteTemplateTask,
  upsertTemplateTask,
} from "@/template-tasks/manage";
import type { TaskTargetTier } from "@/template-tasks/compute";

export type TemplateTaskActionState = {
  ok: boolean;
  message: string;
};

function tiersFromForm(formData: FormData): TaskTargetTier[] {
  const mins = formData
    .getAll("tierMinClicks")
    .map((value) => String(value).trim());
  const amounts = formData
    .getAll("tierBonusAmount")
    .map((value) => String(value).trim());
  const length = Math.max(mins.length, amounts.length);
  const tiers: TaskTargetTier[] = [];
  for (let i = 0; i < length; i += 1) {
    const minRaw = mins[i] ?? "";
    const amountRaw = amounts[i] ?? "";
    if (!minRaw && !amountRaw) {
      continue;
    }
    if (!minRaw || !amountRaw) {
      throw new Error("每一階任務達標都要同時填點選門檻與加發金額");
    }
    tiers.push({
      minClicks: Number(minRaw),
      bonusAmount: Number(amountRaw),
    });
  }
  return tiers;
}

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
  try {
    const tiers = tiersFromForm(formData);
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
