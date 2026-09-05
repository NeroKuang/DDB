"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { PeriodOption } from "@/pay-period/list-period-options";

function monthShortLabel(periodKey: string): string {
  const month = Number(periodKey.slice(5, 7));
  return `${month} 月`;
}

function groupOptionsByYear(
  options: PeriodOption[]
): Array<{ year: string; options: PeriodOption[] }> {
  const byYear = new Map<string, PeriodOption[]>();
  for (const option of options) {
    const year = option.periodKey.slice(0, 4);
    const bucket = byYear.get(year) ?? [];
    bucket.push(option);
    byYear.set(year, bucket);
  }
  return [...byYear.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([year, yearOptions]) => ({ year, options: yearOptions }));
}

function PeriodStatusBadges({
  option,
  size = "sm",
}: {
  option: PeriodOption;
  size?: "sm" | "xs";
}) {
  const textClass = size === "xs" ? "text-[0.625rem]" : "text-[0.6875rem]";
  return (
    <span className={`flex flex-wrap gap-1 ${textClass}`}>
      {option.locked ? (
        <span className="rounded-full border border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] bg-[color-mix(in_srgb,var(--accent-soft)_80%,var(--surface))] px-1.5 py-px font-medium text-[var(--accent)]">
          已鎖
        </span>
      ) : null}
      {option.hasImport ? (
        <span className="rounded-full border border-[color-mix(in_srgb,var(--success)_35%,var(--border))] bg-[color-mix(in_srgb,var(--success)_10%,var(--surface))] px-1.5 py-px font-medium text-[var(--success)]">
          有匯入
        </span>
      ) : null}
    </span>
  );
}

export function PeriodPicker({
  options,
  selectedKey,
  onSelect,
}: {
  options: PeriodOption[];
  selectedKey: string;
  onSelect: (periodKey: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const selectedIndex = options.findIndex(
    (option) => option.periodKey === selectedKey
  );
  const selected =
    selectedIndex >= 0 ? options[selectedIndex] : (options[0] ?? null);
  const canGoOlder = selectedIndex >= 0 && selectedIndex < options.length - 1;
  const canGoNewer = selectedIndex > 0;
  const groupedYears = useMemo(() => groupOptionsByYear(options), [options]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function pick(nextKey: string): void {
    onSelect(nextKey);
    setOpen(false);
  }

  if (!selected) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3"
    >
      <nav
        className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2"
        aria-label="薪資期間"
      >
        <button
          type="button"
          disabled={!canGoOlder}
          onClick={() => {
            if (canGoOlder) {
              pick(options[selectedIndex + 1].periodKey);
            }
          }}
          className="btn-secondary shrink-0 px-2 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40 sm:px-2.5"
          aria-label="上一期（較早月份）"
        >
          <span aria-hidden className="text-base leading-none">
            ‹
          </span>
          <span className="hidden sm:inline sm:ml-0.5">較早</span>
        </button>

        <div className="relative min-w-0 flex-1 sm:flex-none">
          <button
            type="button"
            id={`${panelId}-trigger`}
            aria-expanded={open}
            aria-controls={panelId}
            aria-haspopup="listbox"
            onClick={() => setOpen((value) => !value)}
            className="flex w-full min-w-[10rem] items-center justify-between gap-2 rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left shadow-[0_1px_2px_color-mix(in_srgb,var(--foreground)_5%,transparent)] transition hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] sm:min-w-[13rem]"
          >
            <span className="min-w-0">
              <span className="block font-display text-sm font-semibold tracking-wide sm:text-base">
                {selected.label}
              </span>
              <span className="block text-[0.6875rem] text-muted tabular-nums">
                {selected.periodKey}
              </span>
            </span>
            <span
              aria-hidden
              className={`shrink-0 text-muted transition ${open ? "rotate-180" : ""}`}
            >
              ▾
            </span>
          </button>

          {open ? (
            <div
              id={panelId}
              role="listbox"
              aria-labelledby={`${panelId}-trigger`}
              aria-label="選擇薪資期間"
              className="period-picker-panel absolute top-[calc(100%+0.5rem)] left-0 z-50 max-h-[min(60vh,22rem)] w-[min(calc(100vw-2rem),26rem)] overflow-y-auto p-3 sm:left-1/2 sm:w-[26rem] sm:-translate-x-1/2"
            >
              {groupedYears.map(({ year, options: yearOptions }, index) => (
                <section key={year} className={index > 0 ? "mt-4" : undefined}>
                  <h3 className="mb-2 px-1 font-display text-xs font-semibold tracking-wider text-muted uppercase">
                    {year} 年
                  </h3>
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                    {yearOptions.map((option) => {
                      const active = option.periodKey === selectedKey;
                      return (
                        <button
                          key={option.periodKey}
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => pick(option.periodKey)}
                          className={`rounded border px-2 py-2 text-left transition ${
                            active
                              ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent-soft)_75%,var(--surface))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_25%,transparent)]"
                              : "border-transparent bg-[color-mix(in_srgb,var(--surface-muted)_35%,var(--surface))] hover:border-[var(--border)] hover:bg-[var(--surface-muted)]"
                          }`}
                        >
                          <span
                            className={`block text-sm tabular-nums ${active ? "font-semibold text-[var(--accent)]" : ""}`}
                          >
                            {monthShortLabel(option.periodKey)}
                          </span>
                          {(option.locked || option.hasImport) && (
                            <span className="mt-1 block">
                              <PeriodStatusBadges option={option} size="xs" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          disabled={!canGoNewer}
          onClick={() => {
            if (canGoNewer) {
              pick(options[selectedIndex - 1].periodKey);
            }
          }}
          className="btn-secondary shrink-0 px-2 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40 sm:px-2.5"
          aria-label="下一期（較新月份）"
        >
          <span className="hidden sm:inline sm:mr-0.5">較新</span>
          <span aria-hidden className="text-base leading-none">
            ›
          </span>
        </button>
      </nav>

      <div
        className="flex shrink-0 items-center gap-2 sm:hidden"
        aria-live="polite"
      >
        {selected.locked || selected.hasImport ? (
          <PeriodStatusBadges option={selected} />
        ) : (
          <span className="text-xs text-muted">尚未鎖定 · 無匯入</span>
        )}
      </div>

      <div
        className="hidden shrink-0 items-center gap-2 sm:flex"
        aria-live="polite"
      >
        {selected.locked || selected.hasImport ? (
          <PeriodStatusBadges option={selected} />
        ) : (
          <span className="text-xs text-muted">尚未鎖定 · 無匯入</span>
        )}
      </div>
    </div>
  );
}

export function PeriodPickerFallback() {
  return (
    <div
      className="flex min-w-0 flex-1 animate-pulse items-center gap-2"
      aria-hidden
    >
      <div className="h-9 w-14 rounded bg-[var(--surface-muted)]" />
      <div className="h-11 min-w-[13rem] flex-1 rounded bg-[var(--surface-muted)] sm:flex-none" />
      <div className="h-9 w-14 rounded bg-[var(--surface-muted)]" />
    </div>
  );
}
