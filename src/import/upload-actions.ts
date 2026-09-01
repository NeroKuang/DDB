"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { JULY_2026_PERIOD_KEY } from "@/ad-hoc-tasks/manage";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { assertJulyPayPeriodUnlocked } from "@/pay-period/guards";
import { runIngestPipeline } from "@/import/ingest/run-ingest-pipeline";
import { fileRangeForPeriodKey } from "@/web-fetch/period-file-range";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

export type UploadImportActionState = {
  ok: boolean;
  message: string;
};

export async function uploadIchefFilesAction(
  _prev: UploadImportActionState,
  formData: FormData
): Promise<UploadImportActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以上傳匯入檔。" };
  }
  const storeId = String(formData.get("storeId") ?? "").trim();
  if (!storeId) {
    return { ok: false, message: "門市缺失。" };
  }
  try {
    await assertJulyPayPeriodUnlocked(storeId);
    const entries = formData.getAll("files");
    const files = entries
      .filter((entry): entry is File => entry instanceof File && entry.size > 0)
      .map(async (file) => ({
        filename: file.name,
        bytes: Buffer.from(await file.arrayBuffer()),
      }));
    const resolved = await Promise.all(files);
    if (resolved.length === 0) {
      return { ok: false, message: "請選擇 xlsx 檔案。" };
    }
    const range = fileRangeForPeriodKey(JULY_2026_PERIOD_KEY);
    const store = await prisma.store.findUniqueOrThrow({
      where: { id: storeId },
      select: { code: true },
    });
    const period = await prisma.payPeriod.upsert({
      where: {
        storeId_periodKey: { storeId, periodKey: JULY_2026_PERIOD_KEY },
      },
      create: {
        storeId,
        periodKey: JULY_2026_PERIOD_KEY,
        fetchStatus: "SUCCEEDED",
        fetchFinishedAt: new Date(),
        fetchErrorMessage: null,
        fetchRangeStart: range.startDate,
        fetchRangeEnd: range.endDate,
      },
      update: {
        fetchStatus: "SUCCEEDED",
        fetchFinishedAt: new Date(),
        fetchErrorMessage: null,
        fetchRangeStart: range.startDate,
        fetchRangeEnd: range.endDate,
      },
    });
    const ingested = await runIngestPipeline({
      payPeriodId: period.id,
      storeId,
      storeCode: store.code || ZHONGSHAN_STORE_CODE,
      periodKey: JULY_2026_PERIOD_KEY,
      source: "ADMIN_UPLOAD",
      files: resolved,
      fileRange: range,
    });
    revalidatePath("/payroll");
    revalidatePath("/performance");
    return {
      ok: true,
      message: `已上傳 ${resolved.length} 個檔案並寫入 DB 匯入（${ingested.payRowCount} 列薪資）。${
        ingested.minioSkipped ? "" : " MinIO raw／audit 已上傳。"
      }`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
