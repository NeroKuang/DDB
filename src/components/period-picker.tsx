"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { IconButton } from "@/components/icon-button";
import type { PeriodOption } from "@/pay-period/list-period-options";
import { IconChevronLeft, IconChevronRight } from "@/components/ui-icons";

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
        <span className="border border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] bg-[color-mix(in_srgb,var(--accent-soft)_80%,var(--surface))] px-1.5 py-px font-medium text-[var(--accent)]">
          已鎖
        </span>
      ) : null}
      {option.hasImport ? (
        <span className="border border-[color-mix(in_srgb,var(--success)_35%,var(--border))] bg-[color-mix(in_srgb,var(--success)_10%,var(--surface))] px-1.5 py-px font-medium text-[var(--success)]">
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
      className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2"
    >
      <nav
        className="flex min-w-0 flex-1 items-center gap-1"
        aria-label="薪資期間"
      >
        <IconButton
          label="上一期（較早月份）"
          size="sm"
          className="shrink-0"
          disabled={!canGoOlder}
          onClick={() => {
            if (canGoOlder) {
              pick(options[selectedIndex + 1].periodKey);
            }
          }}
        >
          <IconChevronLeft />
        </IconButton>

        <div className="relative min-w-0 flex-1 sm:flex-none sm:max-w-xs">
          <button
            type="button"
            id={`${panelId}-trigger`}
            aria-expanded={open}
            aria-controls={panelId}
            aria-haspopup="listbox"
            onClick={() => setOpen((value) => !value)}
            className="flex w-full min-w-0 items-center justify-between gap-2 border border-[color-mix(in_srgb,var(--silver)_22%,var(--border))] bg-[var(--surface)] px-2.5 py-1 text-left transition hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--border))]"
          >
            <span className="min-w-0 truncate text-sm tabular-nums">
              <span className="font-medium">{selected.label}</span>
              <span className="ml-2 text-xs text-muted">
                {selected.periodKey}
              </span>
            </span>
            <span
              aria-hidden
              className={`shrink-0 text-xs text-muted transition ${open ? "rotate-180" : ""}`}
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
              className="period-picker-panel absolute top-[calc(100%+0.375rem)] left-0 z-50 max-h-[min(60vh,22rem)] w-[min(calc(100vw-2rem),24rem)] overflow-y-auto p-2.5 sm:left-0 sm:w-[24rem]"
            >
              {groupedYears.map(({ year, options: yearOptions }, index) => (
                <section key={year} className={index > 0 ? "mt-3" : undefined}>
                  <h3 className="mb-1.5 px-1 text-[0.6875rem] font-medium tracking-wide text-muted">
                    {year} 年
                  </h3>
                  <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
                    {yearOptions.map((option) => {
                      const active = option.periodKey === selectedKey;
                      return (
                        <button
                          key={option.periodKey}
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => pick(option.periodKey)}
                          className={`border px-2 py-1.5 text-left transition ${
                            active
                              ? "border-[color-mix(in_srgb,var(--accent)_55%,var(--border))] bg-[color-mix(in_srgb,var(--accent-soft)_55%,var(--surface))]"
                              : "border-transparent bg-[color-mix(in_srgb,var(--surface-muted)_30%,var(--surface))] hover:border-[var(--border)]"
                          }`}
                        >
                          <span
                            className={`block text-sm tabular-nums ${active ? "font-medium text-[var(--accent)]" : ""}`}
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

        <IconButton
          label="下一期（較新月份）"
          size="sm"
          className="shrink-0"
          disabled={!canGoNewer}
          onClick={() => {
            if (canGoNewer) {
              pick(options[selectedIndex - 1].periodKey);
            }
          }}
        >
          <IconChevronRight />
        </IconButton>
      </nav>

      <div className="shrink-0 text-xs text-muted" aria-live="polite">
        {selected.locked || selected.hasImport ? (
          <PeriodStatusBadges option={selected} />
        ) : (
          <span>尚未鎖定 · 無匯入</span>
        )}
      </div>
    </div>
  );
}

export function PeriodPickerFallback() {
  return (
    <div
      className="flex min-w-0 flex-1 animate-pulse items-center gap-1"
      aria-hidden
    >
      <div className="h-7 w-10 bg-[var(--surface-muted)]" />
      <div className="h-7 min-w-[12rem] flex-1 bg-[var(--surface-muted)] sm:flex-none sm:max-w-xs" />
      <div className="h-7 w-10 bg-[var(--surface-muted)]" />
    </div>
  );
}
