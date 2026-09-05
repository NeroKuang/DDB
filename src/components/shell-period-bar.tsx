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
    <div className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_88%,var(--accent-soft))] px-4 py-3 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-2">
        <p className="text-[0.6875rem] font-medium tracking-wide text-muted uppercase">
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
