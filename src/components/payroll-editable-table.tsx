"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { PayRow } from "@/compile/types";
import {
  DEFAULT_PAGE_SIZE,
  paginateItems,
  totalPages,
} from "@/components/list-controls";
import { ListPageControls } from "@/components/list-toolbar";
import { IconButton } from "@/components/icon-button";
import {
  countActiveFilters,
  EMPTY_PAYROLL_FILTERS,
  extractPayrollFilterOptions,
  filterPayRows,
  rowHasStoredOverride,
  type PayrollFilters,
} from "@/components/payroll-filter";
import {
  formatHours,
  formatMoney,
  staffKindLabel,
  venueLabel,
} from "@/components/payroll-format";
import { PayRowDialog } from "@/components/payroll-row-dialog";
import {
  DEFAULT_PAYROLL_SORT,
  nextPayrollSort,
  sortPayRows,
  type PayrollSort,
  type PayrollSortKey,
  type StaffPayProfile,
} from "@/components/payroll-sort";
import { PERIOD_QUERY_PARAM } from "@/components/period-selector";
import { IconEye, IconPencil } from "@/components/ui-icons";

export type { StaffPayProfile };

function MoneyCell({ original, stored }: { original: number; stored: number }) {
  if (original === stored) {
    return <span className="tabular-nums">{formatMoney(stored)}</span>;
  }
  return (
    <span className="tabular-nums">
      <span className="block">{formatMoney(stored)}</span>
      <span className="block text-xs text-muted">
        原始 {formatMoney(original)}
      </span>
    </span>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-0.5 text-xs">
      <span className="text-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-input py-1.5 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function hourlyRateLabel(profile: StaffPayProfile | undefined): string {
  if (!profile || profile.payKind === "monthly") {
    return "—";
  }
  return formatMoney(profile.hourlyRate);
}

function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: PayrollSortKey;
  sort: PayrollSort;
  onSort: (key: PayrollSortKey) => void;
}) {
  const active = sort.key === sortKey;
  const indicator = !active ? "↕" : sort.direction === "asc" ? "↑" : "↓";
  return (
    <th
      aria-sort={
        active
          ? sort.direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 whitespace-nowrap text-left font-medium ${
          active ? "text-[var(--accent)]" : ""
        }`}
      >
        {label}
        <span className="text-xs opacity-70" aria-hidden>
          {indicator}
        </span>
      </button>
    </th>
  );
}

/** 薪資表摘要列表：搜尋／篩選 + 點列開啟 popout 編輯或檢視。 */
export function PayrollEditableTable({
  storeId,
  periodKey,
  rows,
  staffIdByNickname,
  staffPayByNickname = {},
  editable,
}: {
  storeId: string;
  periodKey: string;
  rows: PayRow[];
  staffIdByNickname: Record<string, string>;
  staffPayByNickname?: Record<string, StaffPayProfile>;
  editable: boolean;
}) {
  const [filters, setFilters] = useState<PayrollFilters>(EMPTY_PAYROLL_FILTERS);
  const [sort, setSort] = useState<PayrollSort>(DEFAULT_PAYROLL_SORT);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);
  const router = useRouter();

  const filterOptions = useMemo(
    () => extractPayrollFilterOptions(rows),
    [rows]
  );
  const filteredRows = useMemo(
    () => filterPayRows(rows, filters),
    [rows, filters]
  );
  const sortedRows = useMemo(
    () => sortPayRows(filteredRows, sort, staffPayByNickname),
    [filteredRows, sort, staffPayByNickname]
  );

  const pages = totalPages(sortedRows.length, pageSize);
  const effectivePage = pages === 0 ? 1 : Math.min(page, pages);
  const pagedRows = useMemo(
    () => paginateItems(sortedRows, effectivePage, pageSize),
    [sortedRows, effectivePage, pageSize]
  );

  const selectedRow = useMemo(() => {
    if (!selectedKey) {
      return null;
    }
    return (
      rows.find(
        (row) => `${row.primaryNickname}-${row.venue}` === selectedKey
      ) ?? null
    );
  }, [rows, selectedKey]);

  function openRow(row: PayRow) {
    setSelectedKey(`${row.primaryNickname}-${row.venue}`);
  }

  function closeDialog() {
    setSelectedKey(null);
  }

  function toggleTitle(title: string) {
    setFilters((prev) => {
      const exists = prev.titles.includes(title);
      return {
        ...prev,
        titles: exists
          ? prev.titles.filter((item) => item !== title)
          : [...prev.titles, title],
      };
    });
    setPage(1);
  }

  function clearFilters() {
    setFilters(EMPTY_PAYROLL_FILTERS);
    setPage(1);
  }

  function patchFilters(patch: (prev: PayrollFilters) => PayrollFilters): void {
    setFilters(patch);
    setPage(1);
  }

  function handleSort(key: PayrollSortKey): void {
    setSort((prev) => nextPayrollSort(prev, key));
    setPage(1);
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted">本期沒有薪資列。</p>;
  }

  const activeFilterCount = countActiveFilters(filters);

  return (
    <div className="space-y-3">
      <section className="card-surface space-y-3 p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-base font-medium">薪資列</h2>
        </div>

        <label className="flex flex-col gap-0.5 text-xs">
          <span className="text-muted">搜尋暱稱、本名、職稱、備註</span>
          <input
            type="search"
            value={filters.query}
            onChange={(event) =>
              patchFilters((prev) => ({ ...prev, query: event.target.value }))
            }
            placeholder="例如 祤晞、店長、客座"
            className="field-input"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect
            label="場別"
            value={filters.venue}
            onChange={(value) =>
              patchFilters((prev) => ({
                ...prev,
                venue: value as PayrollFilters["venue"],
              }))
            }
            options={[
              { value: "all", label: "全部場別" },
              { value: "frontOfHouse", label: "外場" },
              { value: "backOfHouse", label: "內場" },
            ]}
          />
          <FilterSelect
            label="類型"
            value={filters.kind}
            onChange={(value) =>
              patchFilters((prev) => ({
                ...prev,
                kind: value as PayrollFilters["kind"],
              }))
            }
            options={[
              { value: "all", label: "全部類型" },
              { value: "regular", label: "正職" },
              { value: "guest", label: "客座" },
            ]}
          />
          <FilterSelect
            label="儲存值"
            value={filters.overrideOnly}
            onChange={(value) =>
              patchFilters((prev) => ({
                ...prev,
                overrideOnly: value as PayrollFilters["overrideOnly"],
              }))
            }
            options={[
              { value: "all", label: "全部" },
              { value: "manual", label: "僅有手調" },
              { value: "original", label: "僅原始值" },
            ]}
          />
          {activeFilterCount > 0 ? (
            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                className="btn-secondary w-full py-1.5 text-sm"
              >
                清除篩選
              </button>
            </div>
          ) : null}
        </div>

        {filterOptions.titles.length > 0 ? (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted">
              職稱篩選（可多選）
              {filters.titles.length > 0
                ? `：已選 ${filters.titles.length} 項`
                : ""}
            </summary>
            <div className="mt-2 flex flex-wrap gap-2">
              {filterOptions.titles.map((title) => {
                const active = filters.titles.includes(title);
                return (
                  <button
                    key={title}
                    type="button"
                    onClick={() => toggleTitle(title)}
                    className={`rounded border px-2 py-1 text-xs ${
                      active
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[var(--border)] bg-[var(--surface)]"
                    }`}
                  >
                    {title || "（空白職稱）"}
                  </button>
                );
              })}
            </div>
          </details>
        ) : null}

        {editable ? (
          <p className="text-xs text-muted">
            點列或「編輯／檢視」圖示開啟視窗調整儲存值；留空欄位表示跟隨原始編成數字。
          </p>
        ) : (
          <p className="text-xs text-muted">點列或「檢視」查看完整薪資明細。</p>
        )}

        <ListPageControls
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          page={effectivePage}
          onPageChange={setPage}
          pages={pages}
          filteredCount={sortedRows.length}
          totalCount={rows.length}
        />
        {activeFilterCount > 0 ? (
          <p className="text-xs text-muted">{activeFilterCount} 個篩選使用中</p>
        ) : null}
      </section>

      <div className="card-surface overflow-x-auto">
        <table className="table-compact w-full min-w-[40rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <SortableHeader
                label="暱稱"
                sortKey="primaryNickname"
                sort={sort}
                onSort={handleSort}
              />
              <SortableHeader
                label="職稱"
                sortKey="title"
                sort={sort}
                onSort={handleSort}
              />
              <SortableHeader
                label="場別"
                sortKey="venue"
                sort={sort}
                onSort={handleSort}
              />
              <SortableHeader
                label="類型"
                sortKey="kind"
                sort={sort}
                onSort={handleSort}
              />
              <SortableHeader
                label="時數"
                sortKey="hours"
                sort={sort}
                onSort={handleSort}
              />
              <SortableHeader
                label="時薪"
                sortKey="hourlyRate"
                sort={sort}
                onSort={handleSort}
              />
              <SortableHeader
                label="業績"
                sortKey="sales"
                sort={sort}
                onSort={handleSort}
              />
              <SortableHeader
                label="業績獎金"
                sortKey="commission"
                sort={sort}
                onSort={handleSort}
              />
              <SortableHeader
                label="當月薪資"
                sortKey="monthlyPay"
                sort={sort}
                onSort={handleSort}
              />
              <SortableHeader
                label="應領薪資"
                sortKey="netPay"
                sort={sort}
                onSort={handleSort}
              />
              <th>狀態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="py-6 text-center text-sm text-muted"
                >
                  沒有符合篩選條件的薪資列。
                </td>
              </tr>
            ) : (
              pagedRows.map((row) => {
                const key = `${row.primaryNickname}-${row.venue}`;
                const hasOverride = rowHasStoredOverride(row);
                return (
                  <tr
                    key={key}
                    className="cursor-pointer border-b border-[var(--border)] hover:bg-[color-mix(in_srgb,var(--accent-soft)_35%,var(--surface))]"
                    onClick={() => openRow(row)}
                  >
                    <td>
                      <Link
                        href={`/performance?nickname=${encodeURIComponent(row.primaryNickname)}&${PERIOD_QUERY_PARAM}=${encodeURIComponent(periodKey)}`}
                        className="text-link"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {row.primaryNickname}
                      </Link>
                      {row.legalName ? (
                        <span className="block text-xs text-muted">
                          {row.legalName}
                        </span>
                      ) : null}
                    </td>
                    <td>{row.title || "—"}</td>
                    <td>{venueLabel(row.venue)}</td>
                    <td>{staffKindLabel(row.kind)}</td>
                    <td className="tabular-nums">
                      {formatHours(row.stored.hours)}
                    </td>
                    <td className="tabular-nums whitespace-nowrap">
                      {hourlyRateLabel(staffPayByNickname[row.primaryNickname])}
                    </td>
                    <td className="tabular-nums">
                      <MoneyCell
                        original={row.original.sales}
                        stored={row.stored.sales}
                      />
                    </td>
                    <td className="tabular-nums">
                      <MoneyCell
                        original={row.original.commission}
                        stored={row.stored.commission}
                      />
                    </td>
                    <td className="tabular-nums">
                      {formatMoney(row.stored.monthlyPay)}
                    </td>
                    <td className="tabular-nums font-medium">
                      {formatMoney(row.stored.netPay)}
                    </td>
                    <td>
                      {hasOverride ? (
                        <span className="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-xs text-[var(--accent)]">
                          手調
                        </span>
                      ) : (
                        <span className="text-xs text-muted">原始</span>
                      )}
                    </td>
                    <td>
                      <IconButton
                        label={editable ? "編輯" : "檢視"}
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          openRow(row);
                        }}
                      >
                        {editable ? <IconPencil /> : <IconEye />}
                      </IconButton>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <PayRowDialog
        row={selectedRow}
        open={selectedRow !== null}
        editable={editable}
        storeId={storeId}
        periodKey={periodKey}
        staffId={
          selectedRow
            ? (staffIdByNickname[selectedRow.primaryNickname] ?? "")
            : ""
        }
        onClose={closeDialog}
        onSaved={() => {
          closeDialog();
          router.refresh();
        }}
      />
    </div>
  );
}
