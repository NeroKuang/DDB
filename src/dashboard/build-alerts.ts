import type { WebFetchProgress } from "@/web-fetch/manage";

export type DashboardAlert = {
  severity: "error" | "warning" | "info" | "success";
  title: string;
  detail?: string;
  href?: string;
};

export function buildPeriodDashboardAlerts(input: {
  locked: boolean;
  compileError: string | null;
  fetch: WebFetchProgress | null;
  importSource: "db" | "storage" | "fixture" | null;
  requiredImportsComplete: boolean;
  lockEligible: boolean;
  unmatchedNicknameCount: number;
  unmatchedClickCount: number;
  minioConfigured: boolean;
  isAdmin: boolean;
  hasImportRun: boolean;
  posItemZeroPriceCount?: number;
  posItemAllBillableZero?: boolean;
}): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  if (input.compileError) {
    alerts.push({
      severity: "error",
      title: "薪資編成失敗",
      detail: input.compileError,
      href: "/payroll",
    });
  }

  if (input.fetch?.status === "FAILED") {
    alerts.push({
      severity: "error",
      title: "網頁取數失敗",
      detail: input.fetch.errorMessage ?? "請至薪資報表重試",
      href: "/payroll",
    });
  }

  if (input.fetch?.status === "RUNNING") {
    alerts.push({
      severity: "info",
      title: "網頁取數進行中",
      detail: "完成後請重新整理薪資報表",
      href: "/payroll",
    });
  }

  if (
    !input.locked &&
    !input.hasImportRun &&
    input.fetch?.status !== "RUNNING"
  ) {
    alerts.push({
      severity: "warning",
      title: "尚未有成功匯入",
      detail: "請先網頁取數或上傳 xlsx",
      href: "/payroll",
    });
  }

  if (!input.requiredImportsComplete && !input.compileError) {
    alerts.push({
      severity: "warning",
      title: "必要匯入未齊",
      detail: "注記 drill-down 可能不完整，編成結果可能缺任務獎金",
      href: "/payroll",
    });
  }

  if (input.unmatchedNicknameCount > 0) {
    alerts.push({
      severity: "warning",
      title: `${input.unmatchedNicknameCount} 個未對上暱稱`,
      detail: "結帳業績注記對不到店員主檔；清空後才能鎖定",
      href: "/payroll",
    });
  }

  if (input.unmatchedClickCount > 0) {
    alerts.push({
      severity: "info",
      title: `${input.unmatchedClickCount} 筆未對上點選`,
      detail: "不阻擋鎖定，但任務獎金可能漏算",
      href: "/payroll",
    });
  }

  if (
    !input.locked &&
    input.requiredImportsComplete &&
    input.unmatchedNicknameCount === 0 &&
    !input.compileError
  ) {
    alerts.push({
      severity: input.lockEligible ? "success" : "info",
      title: input.lockEligible ? "可以鎖定本期" : "核對後可鎖定",
      detail: input.lockEligible ? "必要條件已滿足" : "請確認薪資列與儲存值",
      href: "/payroll",
    });
  }

  if (input.locked) {
    alerts.push({
      severity: "success",
      title: "本期已鎖定",
      detail: "修改匯入或店員設定前需先解鎖",
      href: "/payroll",
    });
  }

  if (input.importSource === "fixture") {
    alerts.push({
      severity: "info",
      title: "目前使用 fixture 匯入",
      detail: "非線上 DB／取數資料，僅供開發或回歸",
      href: "/payroll",
    });
  }

  if (input.isAdmin && !input.minioConfigured) {
    alerts.push({
      severity: "info",
      title: "MinIO 未設定",
      detail: "匯入仍寫 DB，但 raw／audit 存證與 tar.gz 下載會略過",
      href: "/storage-retention",
    });
  }

  if (input.isAdmin && input.posItemAllBillableZero) {
    alerts.push({
      severity: "warning",
      title: "品項售價全部未設定",
      detail:
        "所有非贈送品 POS 售價皆為 0，請至品項管理按「從匯入建議售價」或手動填寫",
      href: "/pos-items",
    });
  } else if (input.isAdmin && (input.posItemZeroPriceCount ?? 0) > 0) {
    alerts.push({
      severity: "warning",
      title: `${input.posItemZeroPriceCount} 個品項未設定售價`,
      detail: "非贈送品售價為 0 會使業績面注記的總賣出／常態抽成顯示 0",
      href: "/pos-items",
    });
  }

  return alerts;
}
