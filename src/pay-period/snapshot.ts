import type { CompileResult } from "@/compile/types";
import type { StaffPerformanceView } from "@/performance/analyze-staff-performance";

export type PeriodSnapshot = {
  version: 1;
  periodLabel: string;
  periodKey: string;
  lockedAtIso: string;
  compile: CompileResult;
  performanceSummaries: StaffPerformanceView[];
};

type SerializedLineItem = Omit<
  StaffPerformanceView["lineItems"][number],
  "at"
> & { at: string };

type SerializedPerformanceView = Omit<StaffPerformanceView, "lineItems"> & {
  lineItems: SerializedLineItem[];
};

type SerializedSnapshot = Omit<PeriodSnapshot, "performanceSummaries"> & {
  performanceSummaries: SerializedPerformanceView[];
};

export function serializePeriodSnapshot(snapshot: PeriodSnapshot): string {
  const payload: SerializedSnapshot = {
    ...snapshot,
    performanceSummaries: snapshot.performanceSummaries.map((view) => ({
      ...view,
      lineItems: view.lineItems.map((item) => ({
        ...item,
        at: item.at.toISOString(),
      })),
    })),
  };
  return JSON.stringify(payload);
}

export function parsePeriodSnapshot(raw: string): PeriodSnapshot {
  const parsed = JSON.parse(raw) as SerializedSnapshot;
  if (parsed.version !== 1) {
    throw new Error("不支援的快照版本");
  }
  return {
    ...parsed,
    performanceSummaries: parsed.performanceSummaries.map((view) => {
      const lineItems = view.lineItems.map((item) => ({
        ...item,
        at: new Date(item.at),
      }));
      const guestAnalysis = view.guestAnalysis ?? [];
      const salesStats =
        view.salesStats ??
        (() => {
          const map = new Map<
            string,
            { orderer: string; amount: number; lineCount: number }
          >();
          for (const item of lineItems) {
            const key = item.orderer;
            const existing = map.get(key);
            if (existing) {
              existing.amount += item.amount;
              existing.lineCount += 1;
            } else {
              map.set(key, {
                orderer: item.orderer,
                amount: item.amount,
                lineCount: 1,
              });
            }
          }
          return [...map.values()];
        })();
      return {
        ...view,
        lineItems,
        guestAnalysis,
        salesStats,
      };
    }),
  };
}
