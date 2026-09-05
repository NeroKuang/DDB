import Link from "next/link";
import { PERIOD_QUERY_PARAM } from "@/components/period-selector";
import type { DashboardAlert } from "@/dashboard/build-alerts";
import type { PeriodDashboardStatus } from "@/dashboard/load-period-dashboard";

const SEVERITY_CLASS: Record<DashboardAlert["severity"], string> = {
  error: "alert-banner alert-error",
  warning: "alert-banner alert-warning",
  info: "alert-banner alert-info",
  success: "alert-banner alert-success",
};

function fetchStatusLabel(status: PeriodDashboardStatus["fetch"]): string {
  if (!status) {
    return "—";
  }
  switch (status.status) {
    case "RUNNING":
      return "進行中";
    case "SUCCEEDED":
      return "成功";
    case "FAILED":
      return "失敗";
    default:
      return "尚未取數";
  }
}

function importSourceLabel(
  source: PeriodDashboardStatus["importSource"]
): string {
  switch (source) {
    case "db":
      return "DB 匯入";
    case "storage":
      return "本機 storage";
    case "fixture":
      return "fixture";
    default:
      return "無";
  }
}

function KpiCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "ok" | "warn" | "bad";
}) {
  const toneClass =
    tone === "ok"
      ? "kpi-card--ok"
      : tone === "warn"
        ? "kpi-card--warn"
        : tone === "bad"
          ? "kpi-card--bad"
          : "";
  return (
    <div className={`kpi-card ${toneClass}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

export function DashboardOverview({
  status,
}: {
  status: PeriodDashboardStatus;
}) {
  const errorCount = status.alerts.filter((a) => a.severity === "error").length;
  const warnCount = status.alerts.filter(
    (a) => a.severity === "warning"
  ).length;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-wide">
          中控台
        </h1>
        <hr className="brand-rule" />
        <p className="text-sm text-muted">
          {status.periodLabel ?? status.periodKey}
          {status.locked ? "（已鎖定）" : ""}
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="待處理問題"
          value={`${errorCount} 錯誤 · ${warnCount} 警告`}
          tone={errorCount > 0 ? "bad" : warnCount > 0 ? "warn" : "ok"}
        />
        <KpiCard
          label="網頁取數"
          value={fetchStatusLabel(status.fetch)}
          tone={
            status.fetch?.status === "FAILED"
              ? "bad"
              : status.fetch?.status === "RUNNING"
                ? "warn"
                : "neutral"
          }
        />
        <KpiCard
          label="必要匯入"
          value={status.requiredImportsComplete ? "齊全" : "未齊"}
          tone={status.requiredImportsComplete ? "ok" : "warn"}
        />
        <KpiCard
          label="可鎖定"
          value={status.locked ? "已鎖" : status.lockEligible ? "是" : "否"}
          tone={status.locked ? "neutral" : status.lockEligible ? "ok" : "warn"}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="薪資列" value={String(status.payRowCount)} />
        <KpiCard
          label="未對上暱稱"
          value={String(status.unmatchedNicknameCount)}
          tone={status.unmatchedNicknameCount > 0 ? "warn" : "ok"}
        />
        <KpiCard
          label="未對上點選"
          value={String(status.unmatchedClickCount)}
          tone={status.unmatchedClickCount > 0 ? "warn" : "ok"}
        />
        <KpiCard
          label="匯入來源"
          value={importSourceLabel(status.importSource)}
        />
      </section>

      {status.alerts.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-medium">問題與待辦</h2>
          <ul className="space-y-2">
            {status.alerts.map((alert) => (
              <li
                key={`${alert.severity}-${alert.title}`}
                className={`px-4 py-3 text-sm ${SEVERITY_CLASS[alert.severity]}`}
              >
                <p className="font-medium">{alert.title}</p>
                {alert.detail ? (
                  <p className="mt-1 text-xs opacity-90">{alert.detail}</p>
                ) : null}
                {alert.href ? (
                  <p className="mt-2">
                    <Link
                      href={alert.href}
                      className="text-xs font-medium text-link"
                    >
                      前往處理 →
                    </Link>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-[var(--success)]">目前沒有偵測到問題。</p>
      )}

      {status.topUnmatchedNicknames.length > 0 ? (
        <section className="card-surface space-y-2 p-4">
          <h2 className="text-base font-medium">未對上暱稱（前 5）</h2>
          <ul className="list-inside list-disc text-sm opacity-80">
            {status.topUnmatchedNicknames.map((item) => (
              <li key={item.nickname}>
                {item.nickname}：{item.amount.toLocaleString("zh-TW")}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-wrap gap-2">
        <Link href="/payroll" className="btn-primary">
          開啟薪資報表
        </Link>
        <Link href="/period-staff" className="btn-secondary">
          本期店員設定
        </Link>
      </section>
    </div>
  );
}

export function PersonalDashboardOverview({
  primaryNickname,
  periodKey,
}: {
  primaryNickname?: string | null;
  periodKey: string;
}) {
  const periodQuery = `${PERIOD_QUERY_PARAM}=${encodeURIComponent(periodKey)}`;
  const href = primaryNickname
    ? `/performance?nickname=${encodeURIComponent(primaryNickname)}&${periodQuery}`
    : `/performance?${periodQuery}`;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold tracking-wide">
        中控台
      </h1>
      <p className="text-sm text-muted">
        個人帳號僅能查看自己的業績面。請用上方選單切換薪資期間。
      </p>
      <Link href={href} className="btn-primary inline-block">
        查看我的業績面
      </Link>
    </div>
  );
}
