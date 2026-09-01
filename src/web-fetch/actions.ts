"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { JULY_2026_PERIOD_KEY } from "@/ad-hoc-tasks/manage";
import { authOptions } from "@/lib/auth-options";
import { runWebFetchJob, startWebFetchAndQueueJob } from "@/web-fetch/manage";

export type WebFetchActionState = {
  ok: boolean;
  message: string;
};

export async function startWebFetchAction(
  _prev: WebFetchActionState,
  formData: FormData
): Promise<WebFetchActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以發動網頁取數。" };
  }
  const storeId = String(formData.get("storeId") ?? "").trim();
  const periodKey = JULY_2026_PERIOD_KEY;
  if (!storeId) {
    return { ok: false, message: "門市缺失。" };
  }
  try {
    const { periodId } = await startWebFetchAndQueueJob({
      actorRole: "ADMIN",
      storeId,
      periodKey,
    });
    after(async () => {
      await runWebFetchJob(periodId);
      revalidatePath("/payroll");
      revalidatePath("/performance");
    });
    revalidatePath("/payroll");
    return {
      ok: true,
      message: "已開始網頁取數，請稍候重新整理查看進度。",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
