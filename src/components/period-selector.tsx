"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PeriodPicker } from "@/components/period-picker";
import type { PeriodOption } from "@/pay-period/list-period-options";

export const PERIOD_QUERY_PARAM = "period";

function writePeriodCookie(periodKey: string): void {
  document.cookie = `ddb-period=${encodeURIComponent(periodKey)}; path=/; max-age=31536000; samesite=lax`;
}

export function PeriodSelector({
  options,
  currentPeriodKey,
}: {
  options: PeriodOption[];
  currentPeriodKey: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedKey = searchParams.get(PERIOD_QUERY_PARAM) ?? currentPeriodKey;

  function onSelect(nextKey: string): void {
    writePeriodCookie(nextKey);
    const params = new URLSearchParams(searchParams.toString());
    params.set(PERIOD_QUERY_PARAM, nextKey);
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  }

  return (
    <PeriodPicker
      options={options}
      selectedKey={selectedKey}
      onSelect={onSelect}
    />
  );
}

/** Append current period query to internal links when present. */
export function hrefWithPeriod(
  href: string,
  periodKey: string | null | undefined
): string {
  if (!periodKey || href.startsWith("http")) {
    return href;
  }
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}${PERIOD_QUERY_PARAM}=${encodeURIComponent(periodKey)}`;
}
