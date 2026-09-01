import { describe, expect, it } from "vitest";
import { buildPeriodDashboardAlerts } from "@/dashboard/build-alerts";

describe("buildPeriodDashboardAlerts", () => {
  it("surfaces compile and unmatched nickname warnings", () => {
    const alerts = buildPeriodDashboardAlerts({
      locked: false,
      compileError: "打卡檔缺失",
      fetch: null,
      importSource: null,
      requiredImportsComplete: false,
      lockEligible: false,
      unmatchedNicknameCount: 2,
      unmatchedClickCount: 0,
      minioConfigured: true,
      isAdmin: true,
      hasImportRun: false,
    });
    expect(alerts.some((a) => a.severity === "error")).toBe(true);
    expect(alerts.some((a) => a.title.includes("未對上暱稱"))).toBe(true);
    expect(alerts.some((a) => a.title.includes("尚未有成功匯入"))).toBe(true);
  });

  it("shows lock-ready success when eligible", () => {
    const alerts = buildPeriodDashboardAlerts({
      locked: false,
      compileError: null,
      fetch: {
        periodKey: "2026-07",
        status: "SUCCEEDED",
        startedAt: null,
        finishedAt: null,
        errorMessage: null,
        rangeStart: null,
        rangeEnd: null,
      },
      importSource: "db",
      requiredImportsComplete: true,
      lockEligible: true,
      unmatchedNicknameCount: 0,
      unmatchedClickCount: 0,
      minioConfigured: true,
      isAdmin: false,
      hasImportRun: true,
    });
    expect(alerts.some((a) => a.title.includes("可以鎖定"))).toBe(true);
  });
});
