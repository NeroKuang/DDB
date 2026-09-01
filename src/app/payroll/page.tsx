import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { JULY_2026_PERIOD_KEY } from "@/ad-hoc-tasks/manage";
import { ImportUploadPanel } from "@/components/import-upload-panel";
import { PayPeriodLockPanel } from "@/components/pay-period-lock-panel";
import { PayrollSummaryTable } from "@/components/payroll-panels";
import { WebFetchPanel } from "@/components/web-fetch-panel";
import { authOptions } from "@/lib/auth-options";
import { ensureAppBootstrap } from "@/lib/ensure-bootstrap";
import { prisma } from "@/lib/prisma";
import {
  getJuly2026PayPeriodState,
  isPayPeriodLocked,
} from "@/pay-period/manage";
import { compileJuly2026Payroll } from "@/payroll/compile-july-payroll";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";
import { getWebFetchProgress } from "@/web-fetch/manage";

export default async function PayrollPage() {
  await ensureAppBootstrap();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role === "PERSONAL") {
    redirect("/");
  }

  let compileError: string | null = null;
  let periodLabel = "";
  let payRows: Awaited<
    ReturnType<typeof compileJuly2026Payroll>
  >["result"]["payRows"] = [];
  let unmatchedNicknames: { nickname: string; amount: number }[] = [];
  let unmatchedClicks: {
    itemName: string;
    nickname: string;
    clicks: number;
  }[] = [];
  let lockEligible = false;
  let requiredImportsComplete = false;
  let locked = false;
  let storeId = "";

  const store = await prisma.store.findUnique({
    where: { code: ZHONGSHAN_STORE_CODE },
  });
  storeId = store?.id ?? "";
  const periodState = await getJuly2026PayPeriodState();
  locked = isPayPeriodLocked(periodState);
  const isAdmin = session.user.role === "ADMIN";
  const canViewFetch =
    session.user.role === "ADMIN" || session.user.role === "SUPERVISOR";
  const fetchProgress =
    storeId && canViewFetch
      ? await getWebFetchProgress(storeId, JULY_2026_PERIOD_KEY)
      : null;

  try {
    const compiled = await compileJuly2026Payroll();
    periodLabel = compiled.periodLabel;
    payRows = compiled.result.payRows;
    unmatchedNicknames = compiled.result.unmatchedNicknames;
    unmatchedClicks = compiled.result.unmatchedClicks;
    lockEligible = compiled.result.lockEligible;
    requiredImportsComplete = compiled.result.requiredImportsComplete;
  } catch (error) {
    compileError = error instanceof Error ? error.message : "編成薪資報表失敗";
  }

  return (
    <main className="mx-auto flex min-h-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm text-zinc-500">
          <Link href="/" className="underline underline-offset-2">
            首頁
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">薪資報表</h1>
        {periodLabel ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            期間：{periodLabel}
            {locked ? "（已鎖定）" : ""}
            。時薪制底薪＝時薪×該列上班時數；月薪整筆落在指定場別。
          </p>
        ) : null}
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <a href="/payroll/export" className="underline underline-offset-2">
            匯出 CSV（儲存值）
          </a>
        </p>
      </header>

      {compileError ? (
        <p role="alert" className="text-sm text-red-700">
          {compileError}
        </p>
      ) : (
        <>
          {storeId && fetchProgress ? (
            <WebFetchPanel
              storeId={storeId}
              progress={fetchProgress}
              locked={locked}
              isAdmin={isAdmin}
            />
          ) : null}
          {storeId ? (
            <ImportUploadPanel
              storeId={storeId}
              locked={locked}
              isAdmin={isAdmin}
            />
          ) : null}
          {storeId ? (
            <PayPeriodLockPanel
              storeId={storeId}
              locked={locked}
              lockEligible={lockEligible}
              isAdmin={isAdmin}
            />
          ) : null}
          <p className="text-sm text-zinc-500">
            必要匯入
            {requiredImportsComplete ? "齊全" : "未齊"}
            ／可鎖定：{lockEligible ? "是" : "否"}
            ／薪資列 {payRows.length} 筆
          </p>
          <PayrollSummaryTable rows={payRows} />
          {unmatchedNicknames.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-base font-medium">未對上的暱稱</h2>
              <p className="text-xs text-zinc-500">
                來自結帳業績注記；清空後才能鎖定本期。
              </p>
              <ul className="list-inside list-disc text-sm text-zinc-600">
                {unmatchedNicknames.map((item) => (
                  <li key={`${item.nickname}-${item.amount}`}>
                    {item.nickname}：{item.amount.toLocaleString("zh-TW")}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {unmatchedClicks.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-base font-medium">未對上的點選</h2>
              <p className="text-xs text-zinc-500">來自注記分析；不擋鎖定。</p>
              <ul className="list-inside list-disc text-sm text-zinc-600">
                {unmatchedClicks.slice(0, 40).map((item) => (
                  <li key={`${item.itemName}-${item.nickname}-${item.clicks}`}>
                    {item.itemName}／{item.nickname}：{item.clicks} 次
                  </li>
                ))}
              </ul>
              {unmatchedClicks.length > 40 ? (
                <p className="text-xs text-zinc-500">
                  另有 {unmatchedClicks.length - 40} 筆未列出。
                </p>
              ) : null}
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
