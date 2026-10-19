"use server";

import { after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { logServerError } from "@/lib/log-server-error";
import { toUserFacingMessage } from "@/lib/user-facing-error";
import { prisma } from "@/lib/prisma";
import {
  runRangeBackfillJobs,
  startRangeBackfill,
} from "@/range/daily-fetch-manage";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

export type RangeBackfillState = {
  ok: boolean;
  message: string;
  queued: string[];
};

export async function startRangeBackfillAction(
  _prev: RangeBackfillState,
  formData: FormData
): Promise<RangeBackfillState> {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false, message: "僅 Admin 可補取", queued: [] };
  }

  const startBusinessDate = String(
    formData.get("startBusinessDate") ?? ""
  ).trim();
  const endBusinessDate = String(formData.get("endBusinessDate") ?? "").trim();
  if (!startBusinessDate || !endBusinessDate) {
    return { ok: false, message: "請選擇起迄營業日", queued: [] };
  }

  const store = await prisma.store.findUnique({
    where: { code: ZHONGSHAN_STORE_CODE },
  });
  if (!store) {
    return { ok: false, message: "門市尚未建立", queued: [] };
  }

  try {
    const { queued } = await startRangeBackfill({
      actorRole: "ADMIN",
      storeId: store.id,
      startBusinessDate,
      endBusinessDate,
    });
    if (queued.length === 0) {
      return {
        ok: true,
        message: "區間內營業日皆已有成功匯入",
        queued: [],
      };
    }
    after(async () => {
      await runRangeBackfillJobs(store.id, queued);
    });
    return {
      ok: true,
      message: `已開始補取 ${queued.length} 個營業日（不影響月結發薪）`,
      queued,
    };
  } catch (error) {
    logServerError("startRangeBackfillAction", error);
    return {
      ok: false,
      message: toUserFacingMessage(error, "補取失敗"),
      queued: [],
    };
  }
}
