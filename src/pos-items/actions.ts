"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import {
  deletePosItem,
  syncPosItemsFromActiveImport,
  updatePosItemGift,
  updatePosItemUnitPrice,
} from "@/pos-items/manage";
import { importPosItemPricesFromSources } from "@/pos-items/import-prices";

export type PosItemActionState = {
  ok: boolean;
  message: string;
};

export async function syncPosItemsAction(
  _prev: PosItemActionState,
  formData: FormData
): Promise<PosItemActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以同步品項。" };
  }
  const storeId = String(formData.get("storeId") ?? "").trim();
  const periodKey = String(formData.get("periodKey") ?? "").trim();
  if (!storeId || !periodKey) {
    return { ok: false, message: "缺少門市或期間。" };
  }
  try {
    const result = await syncPosItemsFromActiveImport(storeId, periodKey);
    revalidatePath("/pos-items");
    revalidatePath("/performance");
    revalidatePath("/template-tasks");
    return {
      ok: true,
      message: `已偵測 ${result.touched} 個品項（新增 ${result.created} 個）。`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function savePosItemPriceAction(
  _prev: PosItemActionState,
  formData: FormData
): Promise<PosItemActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以修改售價。" };
  }
  const storeId = String(formData.get("storeId") ?? "").trim();
  const itemId = String(formData.get("itemId") ?? "").trim();
  const unitPrice = Number(String(formData.get("unitPrice") ?? "").trim());
  try {
    const row = await updatePosItemUnitPrice({
      actorRole: "ADMIN",
      itemId,
      storeId,
      unitPrice,
    });
    revalidatePath("/pos-items");
    revalidatePath("/performance");
    return { ok: true, message: `已儲存「${row.name}」售價。` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function importPosItemPricesAction(
  _prev: PosItemActionState,
  formData: FormData
): Promise<PosItemActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以匯入建議售價。" };
  }
  const storeId = String(formData.get("storeId") ?? "").trim();
  const periodKey = String(formData.get("periodKey") ?? "").trim();
  if (!storeId || !periodKey) {
    return { ok: false, message: "缺少門市或期間。" };
  }
  try {
    const result = await importPosItemPricesFromSources(storeId, periodKey);
    revalidatePath("/pos-items");
    revalidatePath("/performance");
    revalidatePath("/");
    return {
      ok: true,
      message: `已帶入 ${result.updated} 筆建議售價；標記 ${result.giftMarked} 筆兌換／贈送品。`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function togglePosItemGiftAction(
  _prev: PosItemActionState,
  formData: FormData
): Promise<PosItemActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以變更贈送品注記。" };
  }
  const storeId = String(formData.get("storeId") ?? "").trim();
  const itemId = String(formData.get("itemId") ?? "").trim();
  const isGift = String(formData.get("isGift") ?? "") === "true";
  try {
    const row = await updatePosItemGift({
      actorRole: "ADMIN",
      storeId,
      itemId,
      isGift,
    });
    revalidatePath("/pos-items");
    revalidatePath("/performance");
    return {
      ok: true,
      message: isGift
        ? `已標記「${row.name}」為兌換／贈送品。`
        : `已取消「${row.name}」贈送品注記。`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function deletePosItemAction(
  _prev: PosItemActionState,
  formData: FormData
): Promise<PosItemActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以刪除品項。" };
  }
  const storeId = String(formData.get("storeId") ?? "").trim();
  const itemId = String(formData.get("itemId") ?? "").trim();
  try {
    await deletePosItem({ actorRole: "ADMIN", storeId, itemId });
    revalidatePath("/pos-items");
    revalidatePath("/performance");
    return { ok: true, message: "已刪除品項。" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
