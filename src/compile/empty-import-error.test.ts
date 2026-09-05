import { describe, expect, it } from "vitest";
import {
  emptyPeriodImportMessage,
  isEmptyImportCompileError,
} from "@/compile/empty-import-error";
import { buildPeriodDashboardAlerts } from "@/dashboard/build-alerts";

describe("empty import compile errors", () => {
  it("recognizes missing-import messages including File not found", () => {
    expect(isEmptyImportCompileError(emptyPeriodImportMessage("2026-07"))).toBe(
      true
    );
    expect(isEmptyImportCompileError("打卡檔缺失，無法編成薪資報表")).toBe(
      true
    );
    expect(
      isEmptyImportCompileError(
        "File not found: /app/結帳／作廢紀錄_2026-06-30~2026-08-01.xlsx"
      )
    ).toBe(true);
    expect(isEmptyImportCompileError("注記外層解析失敗")).toBe(false);
  });
});

describe("buildPeriodDashboardAlerts empty deploy", () => {
  it("does not warn 必要匯入未齊 when there has never been an import", () => {
    const alerts = buildPeriodDashboardAlerts({
      locked: false,
      compileError: null,
      fetch: null,
      importSource: null,
      requiredImportsComplete: false,
      lockEligible: false,
      unmatchedNicknameCount: 0,
      unmatchedClickCount: 0,
      minioConfigured: true,
      isAdmin: true,
      hasImportRun: false,
    });
    expect(alerts.some((a) => a.title.includes("尚未有成功匯入"))).toBe(true);
    expect(alerts.some((a) => a.title.includes("必要匯入未齊"))).toBe(false);
    expect(alerts.some((a) => a.title.includes("薪資編成失敗"))).toBe(false);
  });
});
