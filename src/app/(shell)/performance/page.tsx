import Link from "next/link";
import { getServerSession } from "next-auth";
import {
  PerformanceDetail,
  PerformanceSummaryTable,
} from "@/components/performance-panels";
import { PageHeader } from "@/components/page-header";
import { authOptions } from "@/lib/auth-options";
import {
  analyzeAllStaffPerformance,
  analyzeStaffPerformance,
  resolveStaffByNickname,
} from "@/performance/analyze-staff-performance";
import { loadJuly2026PerformanceInput } from "@/performance/load-july-performance";
import {
  frozenPerformanceForNickname,
  frozenPerformanceSummaries,
  getJuly2026PayPeriodState,
  isPayPeriodLocked,
} from "@/pay-period/manage";

type PageProps = {
  searchParams: Promise<{ nickname?: string }>;
};

export default async function PerformancePage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  const params = await searchParams;
  const input = await loadJuly2026PerformanceInput();
  const periodState = await getJuly2026PayPeriodState();
  const frozen = isPayPeriodLocked(periodState);
  const role = session?.user?.role;
  const isPersonal = role === "PERSONAL";

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
    const rows = frozen
      ? frozenPerformanceSummaries(periodState!.snapshot!)
      : analyzeAllStaffPerformance({
          allStaff: input.staff,
          checkoutLines: input.checkoutLines,
          noteClicks: input.noteClicks,
          templateTasks: input.templateTasks,
          adHocTasks: input.adHocTasks,
        });
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="業績面"
          description={`期間：${input.periodLabel}${frozen ? "（已鎖定）" : ""}。依結帳業績注記與注記分析編成。`}
        />
        <PerformanceSummaryTable rows={rows} />
      </div>
    );
  }

  const staff = resolveStaffByNickname(input.staff, nickname);
  if (!staff) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="業績面" />
        <p role="alert" className="text-sm text-red-700">
          找不到暱稱「{nickname}」的店員。
        </p>
        {!isPersonal ? (
          <Link href="/performance" className="text-sm underline">
            回列表
          </Link>
        ) : null}
      </div>
    );
  }

  const view =
    frozen && periodState?.snapshot
      ? (frozenPerformanceForNickname(periodState.snapshot, nickname) ??
        analyzeStaffPerformance({
          staff,
          checkoutLines: input.checkoutLines,
          noteClicks: input.noteClicks,
          templateTasks: input.templateTasks,
          adHocTasks: input.adHocTasks,
        }))
      : analyzeStaffPerformance({
          staff,
          checkoutLines: input.checkoutLines,
          noteClicks: input.noteClicks,
          templateTasks: input.templateTasks,
          adHocTasks: input.adHocTasks,
        });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="業績面"
        description={`期間：${input.periodLabel}${frozen ? "（已鎖定）" : ""}`}
      >
        {!isPersonal ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <Link href="/performance" className="underline underline-offset-2">
              業績列表
            </Link>
          </p>
        ) : null}
      </PageHeader>
      <PerformanceDetail view={view} />
    </div>
  );
}
