"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { toUserFacingMessage } from "@/lib/user-facing-error";
import { logServerError } from "@/lib/log-server-error";
import { periodKeyFromFormData } from "@/lib/resolve-period-key";
import { assertPayPeriodUnlockedForWrite } from "@/pay-period/guards";
import { ensurePayPeriodRow } from "@/pay-period/ensure-period-row";
import {
  deleteUnmatchedResolution,
  upsertUnmatchedResolution,
} from "@/pay-period/unmatched-resolutions";
import { DEFAULT_COMMISSION_RATE } from "@/lib/commission-rate";
import { createStaff } from "@/staff/manage";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export type UnmatchedNicknameActionState = {
  ok: boolean;
  message: string;
};

function requireAdminSession(
  session: {
    user?: { id?: string; role?: string };
  } | null
): void {
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("僅 Admin 可略過未對上暱稱");
  }
}

function readStoreId(formData: FormData): string {
  const storeId = String(formData.get("storeId") ?? "").trim();
  if (!storeId) {
    throw new Error("門市缺失。");
  }
  return storeId;
}

function readNickname(formData: FormData): string {
  const nickname = String(formData.get("nickname") ?? "").trim();
  if (!nickname) {
    throw new Error("暱稱缺失。");
  }
  return nickname;
}

async function appendSkippedNickname(
  storeId: string,
  periodKey: string,
  nickname: string
): Promise<void> {
  await ensurePayPeriodRow(storeId, periodKey);
  const row = await prisma.payPeriod.findUniqueOrThrow({
    where: { storeId_periodKey: { storeId, periodKey } },
    select: { skippedUnmatchedNicknames: true },
  });
  const current = row.skippedUnmatchedNicknames ?? [];
  if (current.includes(nickname)) {
    return;
  }
  await prisma.payPeriod.update({
    where: { storeId_periodKey: { storeId, periodKey } },
    data: {
      skippedUnmatchedNicknames: [...current, nickname],
    },
  });
}

async function removeSkippedNickname(
  storeId: string,
  periodKey: string,
  nickname: string
): Promise<void> {
  await ensurePayPeriodRow(storeId, periodKey);
  const row = await prisma.payPeriod.findUnique({
    where: { storeId_periodKey: { storeId, periodKey } },
    select: { skippedUnmatchedNicknames: true },
  });
  const current = row?.skippedUnmatchedNicknames ?? [];
  await prisma.payPeriod.update({
    where: { storeId_periodKey: { storeId, periodKey } },
    data: {
      skippedUnmatchedNicknames: current.filter((item) => item !== nickname),
    },
  });
}

export async function skipUnmatchedNicknameAction(
  _prev: UnmatchedNicknameActionState,
  formData: FormData
): Promise<UnmatchedNicknameActionState> {
  try {
    const session = await getServerSession(authOptions);
    requireAdminSession(session);
    const storeId = readStoreId(formData);
    const periodKey = periodKeyFromFormData(formData);
    const nickname = readNickname(formData);
    await assertPayPeriodUnlockedForWrite(storeId, periodKey);
    await appendSkippedNickname(storeId, periodKey, nickname);
    revalidatePath("/payroll");
    revalidatePath("/");
    return { ok: true, message: `已略過「${nickname}」的鎖定檢查。` };
  } catch (error) {
    logServerError("skipUnmatchedNicknameAction", error);
    return {
      ok: false,
      message: toUserFacingMessage(error, "略過鎖定檢查失敗，請稍後再試。"),
    };
  }
}

export async function unskipUnmatchedNicknameAction(
  _prev: UnmatchedNicknameActionState,
  formData: FormData
): Promise<UnmatchedNicknameActionState> {
  try {
    const session = await getServerSession(authOptions);
    requireAdminSession(session);
    const storeId = readStoreId(formData);
    const periodKey = periodKeyFromFormData(formData);
    const nickname = readNickname(formData);
    await assertPayPeriodUnlockedForWrite(storeId, periodKey);
    await removeSkippedNickname(storeId, periodKey, nickname);
    revalidatePath("/payroll");
    revalidatePath("/");
    return { ok: true, message: `已恢復「${nickname}」的鎖定檢查。` };
  } catch (error) {
    logServerError("unskipUnmatchedNicknameAction", error);
    return {
      ok: false,
      message: toUserFacingMessage(error, "取消略過失敗，請稍後再試。"),
    };
  }
}

async function clearSkippedIfPresent(
  storeId: string,
  periodKey: string,
  nickname: string
): Promise<void> {
  await removeSkippedNickname(storeId, periodKey, nickname);
}

export async function attributeUnmatchedNicknameAction(
  _prev: UnmatchedNicknameActionState,
  formData: FormData
): Promise<UnmatchedNicknameActionState> {
  try {
    const session = await getServerSession(authOptions);
    requireAdminSession(session);
    const storeId = readStoreId(formData);
    const periodKey = periodKeyFromFormData(formData);
    const nickname = readNickname(formData);
    const targetStaffId = String(formData.get("targetStaffId") ?? "").trim();
    if (!targetStaffId) {
      throw new Error("請選擇要認列的店員。");
    }
    await assertPayPeriodUnlockedForWrite(storeId, periodKey);
    const target = await prisma.staff.findFirst({
      where: { id: targetStaffId, storeId },
    });
    if (!target) {
      throw new Error("店員不存在。");
    }
    await upsertUnmatchedResolution({
      storeId,
      periodKey,
      nickname,
      kind: "ATTRIBUTE_PERIOD",
      targetStaffId: target.id,
    });
    await clearSkippedIfPresent(storeId, periodKey, nickname);
    revalidatePath("/payroll");
    revalidatePath("/");
    return {
      ok: true,
      message: `已將「${nickname}」本期認列給 ${target.primaryNickname}。請重算本期。`,
    };
  } catch (error) {
    logServerError("attributeUnmatchedNicknameAction", error);
    return {
      ok: false,
      message: toUserFacingMessage(error, "認列失敗，請稍後再試。"),
    };
  }
}

export async function createGuestFromUnmatchedAction(
  _prev: UnmatchedNicknameActionState,
  formData: FormData
): Promise<UnmatchedNicknameActionState> {
  try {
    const session = await getServerSession(authOptions);
    requireAdminSession(session);
    const storeId = readStoreId(formData);
    const periodKey = periodKeyFromFormData(formData);
    const nickname = readNickname(formData);
    await assertPayPeriodUnlockedForWrite(storeId, periodKey);
    const conflict = await prisma.staff.findFirst({
      where: { storeId, primaryNickname: nickname },
    });
    if (conflict) {
      throw new Error(`主暱稱「${nickname}」已存在，請改用「認列本期」。`);
    }
    const guest = await createStaff({
      actorRole: "ADMIN",
      storeId,
      data: {
        legalName: nickname,
        primaryNickname: nickname,
        contactPhone: "",
        aliases: [],
        title: "客座",
        kind: "guest",
        guestPeriodKey: periodKey,
        payKind: "monthly",
        hourlyRate: 0,
        monthlyPay: 0,
        commissionRate: DEFAULT_COMMISSION_RATE,
        targetBonusAmount: 0,
        laborHealthInsuranceAmount: 0,
        laborHealthInsuranceMode: "fixed",
        laborHealthInsuranceRatio: 0,
        laborHealthInsuranceCarryOverMonthly: true,
        payNote: "",
      },
    });
    await upsertUnmatchedResolution({
      storeId,
      periodKey,
      nickname,
      kind: "CREATE_GUEST_PERIOD",
      targetStaffId: guest.id,
    });
    await clearSkippedIfPresent(storeId, periodKey, nickname);
    revalidatePath("/payroll");
    revalidatePath("/staff");
    revalidatePath("/");
    return {
      ok: true,
      message: `已為「${nickname}」建立本期客座店員。請重算本期。`,
    };
  } catch (error) {
    logServerError("createGuestFromUnmatchedAction", error);
    return {
      ok: false,
      message: toUserFacingMessage(error, "本期建檔失敗，請稍後再試。"),
    };
  }
}

export async function undoUnmatchedResolutionAction(
  _prev: UnmatchedNicknameActionState,
  formData: FormData
): Promise<UnmatchedNicknameActionState> {
  try {
    const session = await getServerSession(authOptions);
    requireAdminSession(session);
    const storeId = readStoreId(formData);
    const periodKey = periodKeyFromFormData(formData);
    const nickname = readNickname(formData);
    await assertPayPeriodUnlockedForWrite(storeId, periodKey);
    const resolution = await prisma.payPeriodUnmatchedResolution.findFirst({
      where: {
        payPeriod: { storeId, periodKey },
        nickname,
      },
      include: { targetStaff: true },
    });
    if (!resolution) {
      throw new Error("找不到此暱稱的處理紀錄。");
    }
    if (resolution.kind === "CREATE_GUEST_PERIOD" && resolution.targetStaffId) {
      await prisma.staff.deleteMany({
        where: {
          id: resolution.targetStaffId,
          kind: "GUEST",
          guestPeriodKey: periodKey,
        },
      });
    }
    await deleteUnmatchedResolution(storeId, periodKey, nickname);
    revalidatePath("/payroll");
    revalidatePath("/staff");
    revalidatePath("/");
    return { ok: true, message: `已撤銷「${nickname}」的處理。` };
  } catch (error) {
    logServerError("undoUnmatchedResolutionAction", error);
    return {
      ok: false,
      message: toUserFacingMessage(error, "撤銷失敗，請稍後再試。"),
    };
  }
}
