import type { UnmatchedNicknameResolutionKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensurePayPeriodRow } from "@/pay-period/ensure-period-row";

export type UnmatchedResolutionRow = {
  nickname: string;
  kind: UnmatchedNicknameResolutionKind;
  targetStaffId: string | null;
  targetPrimaryNickname: string | null;
};

/** nickname → primaryNickname for 本期認列. */
export async function loadPeriodNicknameAttributions(
  storeId: string,
  periodKey: string
): Promise<Map<string, string>> {
  const payPeriod = await prisma.payPeriod.findUnique({
    where: { storeId_periodKey: { storeId, periodKey } },
    include: {
      unmatchedResolutions: {
        where: { kind: "ATTRIBUTE_PERIOD" },
        include: { targetStaff: { select: { primaryNickname: true } } },
      },
    },
  });
  const map = new Map<string, string>();
  if (!payPeriod) {
    return map;
  }
  for (const row of payPeriod.unmatchedResolutions) {
    if (row.targetStaff?.primaryNickname) {
      map.set(row.nickname, row.targetStaff.primaryNickname);
    }
  }
  return map;
}

export async function listUnmatchedResolutions(
  storeId: string,
  periodKey: string
): Promise<UnmatchedResolutionRow[]> {
  const payPeriod = await prisma.payPeriod.findUnique({
    where: { storeId_periodKey: { storeId, periodKey } },
    include: {
      unmatchedResolutions: {
        include: { targetStaff: { select: { primaryNickname: true } } },
        orderBy: { nickname: "asc" },
      },
    },
  });
  if (!payPeriod) {
    return [];
  }
  return payPeriod.unmatchedResolutions.map((row) => ({
    nickname: row.nickname,
    kind: row.kind,
    targetStaffId: row.targetStaffId,
    targetPrimaryNickname: row.targetStaff?.primaryNickname ?? null,
  }));
}

export async function upsertUnmatchedResolution(input: {
  storeId: string;
  periodKey: string;
  nickname: string;
  kind: UnmatchedNicknameResolutionKind;
  targetStaffId?: string | null;
}): Promise<void> {
  const payPeriodId = (await ensurePayPeriodRow(input.storeId, input.periodKey))
    .id;
  await prisma.payPeriodUnmatchedResolution.upsert({
    where: {
      payPeriodId_nickname: { payPeriodId, nickname: input.nickname },
    },
    create: {
      payPeriodId,
      nickname: input.nickname,
      kind: input.kind,
      targetStaffId: input.targetStaffId ?? null,
    },
    update: {
      kind: input.kind,
      targetStaffId: input.targetStaffId ?? null,
    },
  });
}

export async function deleteUnmatchedResolution(
  storeId: string,
  periodKey: string,
  nickname: string
): Promise<void> {
  const payPeriod = await prisma.payPeriod.findUnique({
    where: { storeId_periodKey: { storeId, periodKey } },
    select: { id: true },
  });
  if (!payPeriod) {
    return;
  }
  await prisma.payPeriodUnmatchedResolution.deleteMany({
    where: { payPeriodId: payPeriod.id, nickname },
  });
}
