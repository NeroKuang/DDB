import { redirect } from "next/navigation";
import { ImportUploadPanel } from "@/components/import-upload-panel";
import { ImportStatusPanel } from "@/components/import-status-panel";
import { PageHeader } from "@/components/page-header";
import { PayPeriodLockPanel } from "@/components/pay-period-lock-panel";
import { PayrollEditableTable } from "@/components/payroll-editable-table";
import {
  PayrollStepper,
  resolvePayrollStep,
} from "@/components/payroll-stepper";
import { RecountPayPeriodPanel } from "@/components/recount-pay-period-panel";
import { UnmatchedNicknamesPanel } from "@/components/unmatched-nicknames-panel";
import { WebFetchPanel } from "@/components/web-fetch-panel";
import { getServerSession } from "next-auth";
import { compileZhongshanPayPeriod } from "@/compile/compile-for-period";
import { describeLockBlockReasons } from "@/pay-period/lock-eligibility";
import { authOptions } from "@/lib/auth-options";
import { logServerError } from "@/lib/user-facing-error";
import { prisma } from "@/lib/prisma";
import { resolvePeriodKey } from "@/lib/resolve-period-key";
import { getPayPeriodState, isPayPeriodLocked } from "@/pay-period/manage";
import { listUnmatchedResolutions } from "@/pay-period/unmatched-resolutions";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";
import { staffWhereForPayPeriod } from "@/staff/guest-period";
import { getWebFetchProgress } from "@/web-fetch/manage";
import { loadActiveImportSummary } from "@/import/ingest/load-active-import-summary";

type PageProps = {
  searchParams: Promise<{ period?: string }>;
};

export default async function PayrollPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "PERSONAL") {
    redirect("/");
  }

  const params = await searchParams;

  let compileError: string | null = null;
  let periodLabel = "";
  let periodKey = "";
  let payRows: Awaited<
    ReturnType<typeof compileZhongshanPayPeriod>
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
  let importSummary: Awaited<
    ReturnType<typeof loadActiveImportSummary>
  > | null = null;
  let compileSource: "db" | "storage" | "fixture" | null = null;
  let lockBlockReasons: string[] = [];
  let blockingUnmatchedNicknames: { nickname: string; amount: number }[] = [];
  let adminSkippedNicknames: string[] = [];
  let unmatchedResolutions: Awaited<
    ReturnType<typeof listUnmatchedResolutions>
  > = [];
  let attributeStaffOptions: { id: string; label: string }[] = [];

  const store = await prisma.store.findUnique({
    where: { code: ZHONGSHAN_STORE_CODE },
    include: {
      staff: {
        select: {
          id: true,
          primaryNickname: true,
          hourlyRate: true,
          payKind: true,
        },
      },
    },
  });
  storeId = store?.id ?? "";
  staffIdByNickname = Object.fromEntries(
    (store?.staff ?? []).map((person) => [person.primaryNickname, person.id])
  );
  const staffPayByNickname = Object.fromEntries(
    (store?.staff ?? []).map((person) => [
      person.primaryNickname,
      {
        hourlyRate: person.hourlyRate,
        payKind: person.payKind === "MONTHLY" ? "monthly" : "hourly",
      },
    ])
  ) as Record<string, { hourlyRate: number; payKind: "hourly" | "monthly" }>;
  periodKey = await resolvePeriodKey({
    searchParam: params.period,
    storeId: storeId || undefined,
  });
  const periodState = storeId
    ? await getPayPeriodState(storeId, periodKey)
    : null;
  locked = isPayPeriodLocked(periodState);
  const isAdmin = session?.user?.role === "ADMIN";
  const canViewFetch =
    session?.user?.role === "ADMIN" || session?.user?.role === "SUPERVISOR";
  const fetchProgress =
    storeId && canViewFetch
      ? await getWebFetchProgress(storeId, periodKey)
      : null;

  if (storeId) {
    const period = await prisma.payPeriod.findUnique({
      where: {
        storeId_periodKey: {
          storeId,
          periodKey,
        },
      },
      select: {
        activeImportRunId: true,
        skippedUnmatchedNicknames: true,
      },
    });
    hasImport = Boolean(period?.activeImportRunId);
    adminSkippedNicknames = period?.skippedUnmatchedNicknames ?? [];
    importSummary = await loadActiveImportSummary(storeId, periodKey);
    unmatchedResolutions = await listUnmatchedResolutions(storeId, periodKey);
    const attributeStaff = await prisma.staff.findMany({
      where: staffWhereForPayPeriod(storeId, periodKey),
      orderBy: { primaryNickname: "asc" },
      select: {
        id: true,
        primaryNickname: true,
        legalName: true,
        kind: true,
      },
    });
    attributeStaffOptions = attributeStaff
      .filter((person) => person.kind === "REGULAR")
      .map((person) => ({
        id: person.id,
        label: person.legalName
          ? `${person.primaryNickname}（${person.legalName}）`
          : person.primaryNickname,
      }));
  }

  try {
    const compiled = await compileZhongshanPayPeriod(periodKey);
    periodLabel = compiled.periodLabel;
    compileSource = compiled.source;
    payRows = compiled.result.payRows;
    unmatchedNicknames = compiled.result.unmatchedNicknames;
    unmatchedClicks = compiled.result.unmatchedClicks;
    lockEligible = compiled.result.lockEligible;
    requiredImportsComplete = compiled.result.requiredImportsComplete;
    blockingUnmatchedNicknames = compiled.result.blockingUnmatchedNicknames;
    lockBlockReasons = describeLockBlockReasons({
      requiredImportsComplete,
      blockingUnmatchedNicknames,
    });
  } catch (error) {
    logServerError("payroll-compile", error);
    compileError = "無法編成本期薪資報表。請確認匯入是否齊全，或稍後再試。";
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
            href={`/payroll/export?period=${encodeURIComponent(periodKey)}`}
            className="text-link"
          >
            匯出 CSV（儲存值）
          </a>
        </p>
      </PageHeader>

      <PayrollStepper current={payrollStep} />

      {compileError ? (
        <div role="alert" className="alert-banner alert-warning p-4 text-sm">
          {compileError}
        </div>
      ) : (
        <>
          {storeId && importSummary && canViewFetch ? (
            <ImportStatusPanel
              summary={importSummary}
              compileSource={compileSource}
            />
          ) : null}
          {storeId && fetchProgress ? (
            <WebFetchPanel
              storeId={storeId}
              periodKey={periodKey}
              progress={fetchProgress}
              locked={locked}
              isAdmin={isAdmin}
            />
          ) : null}
          {storeId ? (
            <ImportUploadPanel
              storeId={storeId}
              periodKey={periodKey}
              locked={locked}
              isAdmin={isAdmin}
            />
          ) : null}
          {storeId ? (
            <PayPeriodLockPanel
              storeId={storeId}
              periodKey={periodKey}
              locked={locked}
              lockEligible={lockEligible}
              lockBlockReasons={lockBlockReasons}
              isAdmin={isAdmin}
            />
          ) : null}
          <div className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm opacity-70">
            <span>
              必要匯入
              {requiredImportsComplete ? "齊全" : "未齊"}
              ／可鎖定：{lockEligible ? "是" : "否"}
              ／薪資列 {payRows.length} 筆
            </span>
            {storeId ? (
              <RecountPayPeriodPanel
                storeId={storeId}
                periodKey={periodKey}
                locked={locked}
                isAdmin={isAdmin}
              />
            ) : null}
          </div>
          <PayrollEditableTable
            storeId={storeId}
            periodKey={periodKey}
            rows={payRows}
            staffIdByNickname={staffIdByNickname}
            staffPayByNickname={staffPayByNickname}
            editable={Boolean(storeId) && isAdmin && !locked}
          />
          {storeId ? (
            <UnmatchedNicknamesPanel
              storeId={storeId}
              periodKey={periodKey}
              unmatchedNicknames={unmatchedNicknames}
              adminSkippedNicknames={adminSkippedNicknames}
              resolutions={unmatchedResolutions.map((row) => ({
                nickname: row.nickname,
                kind: row.kind,
                targetPrimaryNickname: row.targetPrimaryNickname,
              }))}
              staffOptions={attributeStaffOptions}
              locked={locked}
              isAdmin={isAdmin}
            />
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
