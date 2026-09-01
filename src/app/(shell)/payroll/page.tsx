import { redirect } from "next/navigation";
import { JULY_2026_PERIOD_KEY } from "@/ad-hoc-tasks/manage";
import { ImportUploadPanel } from "@/components/import-upload-panel";
import { PageHeader } from "@/components/page-header";
import { PayPeriodLockPanel } from "@/components/pay-period-lock-panel";
import { PayrollEditableTable } from "@/components/payroll-editable-table";
import {
  PayrollStepper,
  resolvePayrollStep,
} from "@/components/payroll-stepper";
import { RecountPayPeriodPanel } from "@/components/recount-pay-period-panel";
import { WebFetchPanel } from "@/components/web-fetch-panel";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import {
  getJuly2026PayPeriodState,
  isPayPeriodLocked,
} from "@/pay-period/manage";
import { compileJuly2026Payroll } from "@/payroll/compile-july-payroll";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";
import { getWebFetchProgress } from "@/web-fetch/manage";

export default async function PayrollPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "PERSONAL") {
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
  let staffIdByNickname: Record<string, string> = {};
  let hasImport = false;

  const store = await prisma.store.findUnique({
    where: { code: ZHONGSHAN_STORE_CODE },
    include: { staff: true },
  });
  storeId = store?.id ?? "";
  staffIdByNickname = Object.fromEntries(
    (store?.staff ?? []).map((person) => [person.primaryNickname, person.id])
  );
  const periodState = await getJuly2026PayPeriodState();
  locked = isPayPeriodLocked(periodState);
  const isAdmin = session?.user?.role === "ADMIN";
  const canViewFetch =
    session?.user?.role === "ADMIN" || session?.user?.role === "SUPERVISOR";
  const fetchProgress =
    storeId && canViewFetch
      ? await getWebFetchProgress(storeId, JULY_2026_PERIOD_KEY)
      : null;

  if (storeId) {
    const period = await prisma.payPeriod.findUnique({
      where: {
        storeId_periodKey: {
          storeId,
          periodKey: JULY_2026_PERIOD_KEY,
        },
      },
      select: { activeImportRunId: true },
    });
    hasImport = Boolean(period?.activeImportRunId);
  }

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

  const payrollStep = resolvePayrollStep({
    locked,
    fetchRunning: fetchProgress?.status === "RUNNING",
    hasImport,
    compileError: Boolean(compileError),
    lockEligible,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="薪資報表"
        description={
          periodLabel
            ? `期間：${periodLabel}${locked ? "（已鎖定）" : ""}。時薪制底薪＝時薪×該列上班時數；月薪整筆落在指定場別。`
            : undefined
        }
      >
        <p className="text-sm opacity-70">
          <a
            href="/payroll/export"
            className="text-[var(--accent)] underline underline-offset-2"
          >
            匯出 CSV（儲存值）
          </a>
        </p>
      </PageHeader>

      <PayrollStepper current={payrollStep} />

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
          <p className="text-sm opacity-70">
            必要匯入
            {requiredImportsComplete ? "齊全" : "未齊"}
            ／可鎖定：{lockEligible ? "是" : "否"}
            ／薪資列 {payRows.length} 筆
            {storeId ? (
              <>
                {" "}
                <RecountPayPeriodPanel
                  storeId={storeId}
                  locked={locked}
                  isAdmin={isAdmin}
                />
              </>
            ) : null}
          </p>
          <PayrollEditableTable
            storeId={storeId}
            rows={payRows}
            staffIdByNickname={staffIdByNickname}
            editable={Boolean(storeId) && isAdmin && !locked}
          />
          {unmatchedNicknames.length > 0 ? (
            <section className="alert-banner alert-warning space-y-2 p-4">
              <h2 className="text-base font-medium">
                未對上的暱稱（阻擋鎖定）
              </h2>
              <p className="text-xs opacity-80">
                來自結帳業績注記；請補店員別名或修正主檔後重算。
              </p>
              <ul className="list-inside list-disc text-sm">
                {unmatchedNicknames.map((item) => (
                  <li key={`${item.nickname}-${item.amount}`}>
                    {item.nickname}：{item.amount.toLocaleString("zh-TW")}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {unmatchedClicks.length > 0 ? (
            <section className="card-surface space-y-2 p-4">
              <h2 className="text-base font-medium">未對上的點選</h2>
              <p className="text-xs opacity-70">來自注記分析；不擋鎖定。</p>
              <ul className="list-inside list-disc text-sm opacity-80">
                {unmatchedClicks.slice(0, 40).map((item) => (
                  <li key={`${item.itemName}-${item.nickname}-${item.clicks}`}>
                    {item.itemName}／{item.nickname}：{item.clicks} 次
                  </li>
                ))}
              </ul>
              {unmatchedClicks.length > 40 ? (
                <p className="text-xs opacity-70">
                  另有 {unmatchedClicks.length - 40} 筆未列出。
                </p>
              ) : null}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
