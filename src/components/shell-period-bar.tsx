"use client";

import { Suspense } from "react";
import type { PeriodOption } from "@/pay-period/list-period-options";
import { PeriodPickerFallback } from "@/components/period-picker";
import { PeriodSelector } from "@/components/period-selector";

export function ShellPeriodBar({
  options,
  currentPeriodKey,
}: {
  options: PeriodOption[];
  currentPeriodKey: string;
}) {
  if (options.length === 0) {
    return null;
  }
  return (
    <div className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_92%,var(--accent-soft))] px-4 py-2.5 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-1.5">
        <p className="text-[0.6875rem] font-medium tracking-wide text-muted">
          薪資期間
        </p>
        <Suspense fallback={<PeriodPickerFallback />}>
          <PeriodSelector
            options={options}
            currentPeriodKey={currentPeriodKey}
          />
        </Suspense>
      </div>
    </div>
  );
}
