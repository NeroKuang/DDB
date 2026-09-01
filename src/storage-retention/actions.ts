"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import {
  archiveRawPeriodNow,
  runStorageRetentionCron,
} from "@/storage-retention/run-retention";

export type StorageRetentionActionState = {
  ok: boolean;
  message: string;
};

export async function runStorageRetentionAction(
  _prev: StorageRetentionActionState,
  _formData: FormData
): Promise<StorageRetentionActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以管理 raw 保留策略" };
  }
  try {
    const result = await runStorageRetentionCron();
    revalidatePath("/storage-retention");
    if (!result.minioConfigured) {
      return {
        ok: false,
        message: "MinIO 未設定，無法執行保留策略。",
      };
    }
    const parts = [
      `壓縮 ${result.archived.length} 期`,
      `清除 ${result.purged.length} 期`,
    ];
    if (result.skipped.length > 0) {
      parts.push(`略過 ${result.skipped.length} 期（見錯誤）`);
    }
    if (
      result.archived.length === 0 &&
      result.purged.length === 0 &&
      result.skipped.length === 0
    ) {
      return { ok: true, message: "掃描完成：目前無需變更的期間。" };
    }
    return { ok: true, message: `保留策略完成：${parts.join("、")}。` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function archiveRawPeriodAction(
  _prev: StorageRetentionActionState,
  formData: FormData
): Promise<StorageRetentionActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以管理 raw 保留策略" };
  }
  try {
    const storeCode = String(formData.get("storeCode") ?? "").trim();
    const periodKey = String(formData.get("periodKey") ?? "").trim();
    if (!storeCode || !periodKey) {
      return { ok: false, message: "門市或期間缺失。" };
    }
    const result = await archiveRawPeriodNow({ storeCode, periodKey });
    revalidatePath("/storage-retention");
    return {
      ok: true,
      message: `已壓縮 ${periodKey}（${result.fileCount} 個 xlsx）→ ${result.archiveKey}`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
