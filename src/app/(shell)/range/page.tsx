import { getServerSession } from "next-auth";
import { PageHeader } from "@/components/page-header";
import {
  RangeBackfillForm,
  RangeCoverageBar,
  RangeDateForm,
  RangeDisclaimerBanner,
  RangeStaffTable,
  RangeUnmatchedList,
} from "@/components/range-view-panels";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import {
  loadRangeView,
  resolveRangeQueryParams,
} from "@/range/load-range-view";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ start?: string; end?: string }>;
};

export default async function RangePage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const role = session?.user?.role;
  const isPersonal = role === "PERSONAL";
  const isAdmin = role === "ADMIN";

  const store = await prisma.store.findUnique({
    where: { code: ZHONGSHAN_STORE_CODE },
    select: { id: true },
  });

  const { startBusinessDate, endBusinessDate } = resolveRangeQueryParams({
    start: params.start,
    end: params.end,
  });

  if (!store) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="營業日區間" />
        <RangeDisclaimerBanner />
        <p role="alert" className="text-sm text-[var(--danger)]">
          門市尚未建立。
        </p>
      </div>
    );
  }

  if (isPersonal && !session?.user?.primaryNickname) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="營業日區間" />
        <RangeDisclaimerBanner />
        <p role="alert" className="text-sm text-[var(--danger)]">
          此 personal 帳號尚未綁定店員，請聯絡 Admin。
        </p>
      </div>
    );
  }

  let result;
  let loadError: string | null = null;
  try {
    result = await loadRangeView({
      storeId: store.id,
      startBusinessDate,
      endBusinessDate,
      onlyPrimaryNickname: isPersonal
        ? (session?.user?.primaryNickname ?? undefined)
        : undefined,
      personalView: isPersonal,
    });
  } catch (error) {
    loadError = error instanceof Error ? error.message : "載入失敗";
    result = null;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="營業日區間"
        description="依營業日選擇區間查看消費與時數預估；與月結發薪分離。"
      />
      <RangeDisclaimerBanner />
      <RangeDateForm
        startBusinessDate={startBusinessDate}
        endBusinessDate={endBusinessDate}
      />
      {loadError ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {loadError}
        </p>
      ) : null}
      {result ? (
        <>
          <RangeCoverageBar result={result} />
          {!isPersonal ? (
            <RangeBackfillForm
              startBusinessDate={startBusinessDate}
              endBusinessDate={endBusinessDate}
              isAdmin={isAdmin}
            />
          ) : null}
          <RangeStaffTable result={result} showHours={!isPersonal} />
          {!isPersonal ? <RangeUnmatchedList result={result} /> : null}
          <p className="text-xs text-muted">
            實際時間窗：{result.bounds.startIso} ～ {result.bounds.endIso}
            （半開區間）
          </p>
        </>
      ) : null}
    </div>
  );
}
