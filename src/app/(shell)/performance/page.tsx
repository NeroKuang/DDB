import Link from "next/link";
import { getServerSession } from "next-auth";
import {
  PerformanceDetail,
  PerformanceSummaryTable,
} from "@/components/performance-panels";
import { PageHeader } from "@/components/page-header";
import { PERIOD_QUERY_PARAM } from "@/components/period-selector";
import { authOptions } from "@/lib/auth-options";
import { resolvePeriodKey } from "@/lib/resolve-period-key";
import { prisma } from "@/lib/prisma";
import {
  buildStaffPerformanceViews,
  pickStaffPerformanceView,
} from "@/performance/build-performance-views";
import { loadPerformanceInput } from "@/performance/load-performance-input";
import { resolveStaffByNickname } from "@/performance/analyze-staff-performance";
import {
  frozenPerformanceSummaries,
  getPayPeriodState,
  isPayPeriodLocked,
} from "@/pay-period/manage";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

type PageProps = {
  searchParams: Promise<{ nickname?: string; period?: string }>;
};

export default async function PerformancePage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const store = await prisma.store.findUnique({
    where: { code: ZHONGSHAN_STORE_CODE },
    select: { id: true },
  });
  const periodKey = await resolvePeriodKey({
    searchParam: params.period,
    storeId: store?.id,
  });
  const input = await loadPerformanceInput(periodKey, { storeId: store?.id });
  const liveViews = buildStaffPerformanceViews(input);
  const periodState = store
    ? await getPayPeriodState(store.id, periodKey)
    : null;
  const frozen = isPayPeriodLocked(periodState);
  const views =
    frozen && periodState?.snapshot
      ? frozenPerformanceSummaries(periodState.snapshot)
      : liveViews;
  const role = session?.user?.role;
  const isPersonal = role === "PERSONAL";
  const periodQuery = `${PERIOD_QUERY_PARAM}=${encodeURIComponent(periodKey)}`;

  let nickname = params.nickname?.trim() || "";
  if (isPersonal) {
    if (!session?.user?.primaryNickname) {
      return (
        <div className="flex flex-col gap-4">
          <PageHeader title="業績面" />
          <p role="alert" className="text-sm text-red-700">
            此 personal 帳號尚未綁定店員，請聯絡 Admin。
          </p>
          <Link href="/" className="text-sm underline">
            回首頁
          </Link>
        </div>
      );
    }
    nickname = session.user.primaryNickname;
  }

  if (!nickname) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="業績面"
          description={`期間：${input.periodLabel}${frozen ? "（已鎖定）" : ""}。依結帳業績注記與注記分析編成。`}
        />
        <PerformanceSummaryTable rows={views} periodKey={periodKey} />
      </div>
    );
  }

  const staff = resolveStaffByNickname(
    input.staff,
    nickname,
    input.periodNicknameAttributions
  );
  if (!staff) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="業績面" />
        <p role="alert" className="text-sm text-red-700">
          找不到暱稱「{nickname}」的店員。
        </p>
        {!isPersonal ? (
          <Link
            href={`/performance?${periodQuery}`}
            className="text-sm underline"
          >
            回列表
          </Link>
        ) : null}
      </div>
    );
  }

  const view = pickStaffPerformanceView(views, staff);
  if (!view) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="業績面" />
        <p role="alert" className="text-sm text-red-700">
          {frozen
            ? `鎖定快照中找不到「${staff.primaryNickname}」的業績列。`
            : `「${staff.primaryNickname}」本期沒有業績資料。`}
        </p>
        {!isPersonal ? (
          <Link
            href={`/performance?${periodQuery}`}
            className="text-sm underline"
          >
            回列表
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="業績面"
        description={`期間：${input.periodLabel}${frozen ? "（已鎖定）" : ""}`}
      >
        {!isPersonal ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <Link
              href={`/performance?${periodQuery}`}
              className="underline underline-offset-2"
            >
              業績列表
            </Link>
          </p>
        ) : null}
      </PageHeader>
      <PerformanceDetail view={view} />
    </div>
  );
}
