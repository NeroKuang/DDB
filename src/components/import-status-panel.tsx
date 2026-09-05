import type { ActiveImportSummary } from "@/import/ingest/load-active-import-summary";
import { formatTaipeiDateTime } from "@/lib/format-datetime";
import { periodKeyDisplayLabel } from "@/lib/pay-period-calendar";
import { previousCalendarMonthKey } from "@/cron/month-end-fetch";

function formatWhen(value: Date | null): string | null {
  if (!value) {
    return null;
  }
  return formatTaipeiDateTime(value);
}

function sourceLabel(source: ActiveImportSummary["source"]): string {
  switch (source) {
    case "WEB_FETCH":
      return "網頁取數";
    case "ADMIN_UPLOAD":
      return "Admin 上傳";
    default:
      return "—";
  }
}

function formatBusinessDay(iso: string): string {
  return iso.slice(0, 16).replace("T", " ");
}

export function ImportStatusPanel({
  summary,
  compileSource,
}: {
  summary: ActiveImportSummary;
  compileSource: "db" | "storage" | "fixture" | null;
}) {
  const cronTarget = previousCalendarMonthKey();

  return (
    <section className="card-surface space-y-2 p-4">
      <h2 className="text-base font-medium">本期匯入與編成來源</h2>
      <dl className="grid gap-1 text-sm">
        <div className="flex flex-wrap gap-x-2 gap-y-0">
          <dt className="text-muted">薪資期間</dt>
          <dd>
            {periodKeyDisplayLabel(summary.periodKey)}（{summary.periodKey}）
          </dd>
        </div>
        <div className="flex flex-wrap gap-x-2 gap-y-0">
          <dt className="text-muted">營業日</dt>
          <dd>
            {formatBusinessDay(summary.businessDayStart)}～
            {formatBusinessDay(summary.businessDayEnd)}（Asia/Taipei）
          </dd>
        </div>
        <div className="flex flex-wrap gap-x-2 gap-y-0">
          <dt className="text-muted">編成資料來源</dt>
          <dd>
            {compileSource === "db"
              ? "資料庫（本期 active 匯入）"
              : compileSource === "storage"
                ? "MinIO／本機 storage（依檔案區間）"
                : compileSource === "fixture"
                  ? "7 月 fixture（非 iCHEF 真實取數）"
                  : "—"}
          </dd>
        </div>
        {summary.hasActiveImport ? (
          <>
            <div className="flex flex-wrap gap-x-2 gap-y-0">
              <dt className="text-muted">匯入方式</dt>
              <dd>{sourceLabel(summary.source)}</dd>
            </div>
            {summary.fileRangeStart && summary.fileRangeEnd ? (
              <div className="flex flex-wrap gap-x-2 gap-y-0">
                <dt className="text-muted">iCHEF 檔案區間</dt>
                <dd>
                  {summary.fileRangeStart}～{summary.fileRangeEnd}
                </dd>
              </div>
            ) : null}
            {formatWhen(summary.finishedAt) ? (
              <div className="flex flex-wrap gap-x-2 gap-y-0">
                <dt className="text-muted">匯入完成</dt>
                <dd>{formatWhen(summary.finishedAt)}</dd>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-x-2 gap-y-0">
              <dt className="text-muted">筆數</dt>
              <dd>
                結帳 {summary.checkoutLineCount}、打卡 {summary.punchPairCount}
                、注記點選 {summary.noteClickCount}、 原始檔{" "}
                {summary.rawFileCount}
                {summary.noteOuterComplete ? "" : "（注記外層未齊）"}
              </dd>
            </div>
          </>
        ) : (
          <dd className="text-sm text-muted">
            本期尚無成功匯入。若編成仍有數字，可能來自 fixture 或 storage
            舊檔，不代表 cron／取數已寫入此期。
          </dd>
        )}
      </dl>
      <p className="text-xs text-muted">
        月結 cron（每月 2 日 12:00）固定取「前一個日曆月」
        {periodKeyDisplayLabel(cronTarget)}
        ，不會依你在畫面上選的月份。手動「開始網頁取數」才會寫入目前所選期間。
      </p>
    </section>
  );
}
