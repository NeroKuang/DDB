"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { DialogCloseButton } from "@/components/dialog-close-button";
import { DialogShellChrome } from "@/components/cathedral-ornament";
import { IconButton } from "@/components/icon-button";
import { PERIOD_QUERY_PARAM } from "@/components/period-selector";
import { ListToolbar } from "@/components/list-toolbar";
import { useClientList } from "@/components/use-client-list";
import { IconEye } from "@/components/ui-icons";
import type {
  MoneyPair,
  PerformanceLineItem,
  SalesStatRow,
  StaffPerformanceView,
} from "@/performance/analyze-staff-performance";
import { formatTaipeiDateTime } from "@/lib/format-datetime";

function formatMoney(value: number): string {
  return value.toLocaleString("zh-TW", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatWhen(at: Date): string {
  return formatTaipeiDateTime(at) ?? "—";
}

function ordererLabel(orderer: string): string {
  return orderer ? orderer : "無訂購人";
}

function MoneyPairCell({ pair }: { pair: MoneyPair }) {
  const same = pair.original === pair.stored;
  return (
    <span className="tabular-nums">
      {same ? (
        formatMoney(pair.stored)
      ) : (
        <>
          <span className="block">{formatMoney(pair.stored)}</span>
          <span className="block text-xs text-muted">
            原始 {formatMoney(pair.original)}
          </span>
        </>
      )}
    </span>
  );
}

function MoneyPairDl({ label, pair }: { label: string; pair: MoneyPair }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="text-lg tabular-nums">{formatMoney(pair.stored)}</dd>
      <dd className="text-xs text-muted">原始 {formatMoney(pair.original)}</dd>
    </div>
  );
}

function performanceHaystack(row: StaffPerformanceView): string {
  return [row.primaryNickname, row.legalName].join(" ");
}

export function PerformanceSummaryTable({
  rows,
  periodKey,
}: {
  rows: StaffPerformanceView[];
  periodKey: string;
}) {
  const list = useClientList({
    items: rows,
    getSearchHaystack: performanceHaystack,
  });

  if (rows.length === 0) {
    return <p className="text-sm text-muted">本期沒有業績注記。</p>;
  }
  return (
    <div className="space-y-3">
      <ListToolbar
        query={list.query}
        onQueryChange={list.setQuery}
        searchLabel="搜尋店員"
        searchPlaceholder="暱稱、本名"
        pageSize={list.pageSize}
        onPageSizeChange={list.setPageSize}
        page={list.page}
        onPageChange={list.setPage}
        pages={list.pages}
        filteredCount={list.filteredCount}
        totalCount={list.totalCount}
      />
      {list.filteredCount === 0 ? (
        <p className="text-sm text-muted">沒有符合的店員。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="py-2 pr-3 font-medium">暱稱</th>
                <th className="py-2 pr-3 font-medium">本名</th>
                <th className="py-2 pr-3 font-medium">
                  個人業績（採用／原始）
                </th>
                <th className="py-2 font-medium">業績獎金（採用／原始）</th>
              </tr>
            </thead>
            <tbody>
              {list.pageItems.map((row) => (
                <tr
                  key={row.primaryNickname}
                  className="border-b border-[var(--border)]"
                >
                  <td className="py-2 pr-3">
                    <Link
                      href={`/performance?nickname=${encodeURIComponent(row.primaryNickname)}&${PERIOD_QUERY_PARAM}=${encodeURIComponent(periodKey)}`}
                      className="text-link underline underline-offset-2"
                    >
                      {row.primaryNickname}
                    </Link>
                  </td>
                  <td className="py-2 pr-3">{row.legalName || "—"}</td>
                  <td className="py-2 pr-3">
                    <MoneyPairCell pair={row.personalSales} />
                  </td>
                  <td className="py-2">
                    <MoneyPairCell pair={row.commission} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LineItemsDetailDialog({
  open,
  onClose,
  title,
  lines,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  lines: PerformanceLineItem[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="payroll-dialog max-w-3xl"
      onClose={onClose}
      aria-labelledby={titleId}
    >
      <DialogShellChrome>
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="section-title font-display">
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {lines.length} 筆 · 合計{" "}
              {formatMoney(lines.reduce((sum, line) => sum + line.amount, 0))}
            </p>
          </div>
          <DialogCloseButton onClick={onClose} />
        </header>
        {lines.length === 0 ? (
          <p className="text-sm text-muted">沒有明細。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="py-2 pr-3 font-medium">時間</th>
                  <th className="py-2 pr-3 font-medium">暱稱</th>
                  <th className="py-2 pr-3 font-medium">訂購人</th>
                  <th className="py-2 font-medium">金額</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((item, index) => (
                  <tr
                    key={`${item.at.toISOString()}-${index}`}
                    className="border-b border-[var(--border)]"
                  >
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {formatWhen(item.at)}
                    </td>
                    <td className="py-2 pr-3">{item.nicknameUsed}</td>
                    <td className="py-2 pr-3">{ordererLabel(item.orderer)}</td>
                    <td className="py-2 tabular-nums">
                      {formatMoney(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogShellChrome>
    </dialog>
  );
}

function SalesStatsSection({
  salesStats,
  lineItems,
  personalSales,
}: {
  salesStats: SalesStatRow[];
  lineItems: PerformanceLineItem[];
  personalSales: number;
}) {
  const [detailOrderer, setDetailOrderer] = useState<string | null>(null);
  const detailLines = useMemo(() => {
    if (detailOrderer === null) {
      return [];
    }
    return lineItems.filter((item) => item.orderer === detailOrderer);
  }, [detailOrderer, lineItems]);
  const statsTotal = useMemo(
    () => salesStats.reduce((sum, row) => sum + row.amount, 0),
    [salesStats]
  );

  return (
    <section
      id="sales-stats"
      className="card-surface scroll-mt-24 space-y-2 p-4"
    >
      <h2 className="section-title">銷售統計</h2>
      <p className="text-sm text-muted">
        結帳「業績注記」依訂購人加總（含無訂購人）。無訂購人／麒麒這類金額的來源在這裡；點「來源明細」看各筆時間。
      </p>
      <p className="text-xs text-muted tabular-nums">
        統計合計 {formatMoney(statsTotal)}
        {Math.abs(statsTotal - personalSales) < 0.005
          ? "（等於個人業績）"
          : `（個人業績 ${formatMoney(personalSales)}）`}
      </p>
      {salesStats.length === 0 ? (
        <p className="text-sm text-muted">沒有可列出的銷售。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[22rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="py-2 pr-3 font-medium">訂購人</th>
                <th className="py-2 pr-3 font-medium">筆數</th>
                <th className="py-2 pr-3 font-medium">金額</th>
                <th className="py-2 text-right font-medium">來源明細</th>
              </tr>
            </thead>
            <tbody>
              {salesStats.map((row) => (
                <tr
                  key={row.orderer || "__none__"}
                  className="border-b border-[var(--border)]"
                >
                  <td className="py-2 pr-3 font-medium">
                    {ordererLabel(row.orderer)}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{row.lineCount}</td>
                  <td className="py-2 pr-3 text-base tabular-nums">
                    {formatMoney(row.amount)}
                  </td>
                  <td className="py-2 text-right">
                    <IconButton
                      label={`來源明細：${ordererLabel(row.orderer)}`}
                      size="sm"
                      onClick={() => setDetailOrderer(row.orderer)}
                    >
                      <IconEye />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <LineItemsDetailDialog
        open={detailOrderer !== null}
        onClose={() => setDetailOrderer(null)}
        title={`來源明細 · ${ordererLabel(detailOrderer ?? "")}`}
        lines={detailLines}
      />
    </section>
  );
}

function LineItemsSection({ lines }: { lines: PerformanceLineItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + line.amount, 0),
    [lines]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return lines;
    }
    return lines.filter((item) => {
      const haystack = [
        item.nicknameUsed,
        ordererLabel(item.orderer),
        formatMoney(item.amount),
        formatWhen(item.at),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [lines, query]);

  return (
    <section className="card-surface space-y-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="section-title">業績項</h2>
          <p className="mt-1 text-sm text-muted">
            {lines.length} 筆 · 合計 {formatMoney(total)}
            <span className="text-muted">（結帳業績注記）</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {expanded ? (
            <button
              type="button"
              className="btn-secondary px-2.5 py-1 text-xs"
              onClick={() => setDetailOpen(true)}
              disabled={filtered.length === 0}
            >
              查看明細
            </button>
          ) : null}
          <button
            type="button"
            className="btn-secondary px-2.5 py-1 text-xs"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "收合" : "展開"}
          </button>
        </div>
      </div>

      {expanded ? (
        lines.length === 0 ? (
          <p className="text-sm text-muted">沒有業績注記。</p>
        ) : (
          <div className="space-y-3">
            <label className="flex max-w-sm flex-col gap-0.5 text-xs">
              <span className="text-muted">搜尋業績項</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="訂購人、暱稱、金額、時間"
                className="field-input"
              />
            </label>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted">沒有符合的業績項。</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="py-2 pr-3 font-medium">時間</th>
                      <th className="py-2 pr-3 font-medium">暱稱</th>
                      <th className="py-2 pr-3 font-medium">訂購人</th>
                      <th className="py-2 font-medium">金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item, index) => (
                      <tr
                        key={`${item.at.toISOString()}-${index}`}
                        className="border-b border-[var(--border)]"
                      >
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {formatWhen(item.at)}
                        </td>
                        <td className="py-2 pr-3">{item.nicknameUsed}</td>
                        <td className="py-2 pr-3">
                          {ordererLabel(item.orderer)}
                        </td>
                        <td className="py-2 tabular-nums">
                          {formatMoney(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      ) : null}

      <LineItemsDetailDialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="業績項明細"
        lines={filtered}
      />
    </section>
  );
}

function NoteClicksSection({ view }: { view: StaffPerformanceView }) {
  return (
    <section className="card-surface space-y-2 p-4">
      <h2 className="section-title">任務／注記點選</h2>
      <p className="text-sm leading-relaxed text-muted">
        結帳金額不會出現在本區。請到上方{" "}
        <a href="#sales-stats" className="text-link font-medium underline">
          銷售統計
        </a>{" "}
        看來源明細。本區只有「點了哪些注記品項」。
      </p>
      {view.noteList.length === 0 ? (
        <p className="text-sm text-muted">本期沒有注記點選。</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {view.noteList.map((row) => (
            <li
              key={row.itemName}
              className="leading-snug [word-break:keep-all]"
            >
              {row.itemName}
              <span className="ml-2 tabular-nums text-muted">
                ×{row.clicks}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PerformanceDetail({ view }: { view: StaffPerformanceView }) {
  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-2">
        <h2 className="section-title">個人業績</h2>
        <p className="text-sm text-muted">
          {view.legalName || "（無本名）"}／{view.primaryNickname}
        </p>
        <p className="text-xs text-muted">
          採用值為儲存值；尚未手調時與原始數字相同。個人業績的金額拆解（含無訂購人、如麒麒）在下方「銷售統計」，不是「任務／注記點選」。
        </p>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <MoneyPairDl label="個人業績" pair={view.personalSales} />
          <MoneyPairDl label="業績獎金" pair={view.commission} />
          <MoneyPairDl label="任務獎金" pair={view.taskBonus} />
          <div>
            <dt className="text-muted">業績項筆數</dt>
            <dd className="text-lg tabular-nums">{view.lineItems.length}</dd>
          </div>
        </dl>
      </section>

      <SalesStatsSection
        salesStats={view.salesStats}
        lineItems={view.lineItems}
        personalSales={view.personalSales.original}
      />

      <LineItemsSection lines={view.lineItems} />

      <NoteClicksSection view={view} />

      <section className="space-y-2">
        <h2 className="section-title">追加任務</h2>
        <p className="text-sm text-muted">
          老闆本期其他需求。須確認派發後才計入任務獎金；原始金額為
          0，採用儲存值。
        </p>
        {view.adHocTasks.length === 0 ? (
          <p className="text-sm text-muted">本期沒有追加任務。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="py-2 pr-3 font-medium">名稱</th>
                  <th className="py-2 pr-3 font-medium">儲存值</th>
                  <th className="py-2 font-medium">狀態</th>
                </tr>
              </thead>
              <tbody>
                {view.adHocTasks.map((row, index) => (
                  <tr
                    key={`${row.name}-${index}`}
                    className="border-b border-[var(--border)]"
                  >
                    <td className="py-2 pr-3">{row.name}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatMoney(row.storedAmount)}
                    </td>
                    <td className="py-2">
                      {row.confirmed ? "已確認派發" : "待確認（不計入）"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
