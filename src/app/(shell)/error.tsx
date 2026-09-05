"use client";

import { useEffect, useRef } from "react";
import { reportClientErrorAction } from "@/lib/report-client-error";

export default function ShellError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const reportedKey = useRef<string | null>(null);

  useEffect(() => {
    const key = `${error.digest ?? ""}:${error.message}`;
    if (reportedKey.current === key) {
      return;
    }
    reportedKey.current = key;
    console.error("[shell-error]", error.message, error.digest);
    void reportClientErrorAction({
      context: "shell-error",
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
    // Intentionally omit error.stack from deps — identity can churn without new errors.
  }, [error.digest, error.message]);

  return (
    <div className="card-surface mx-auto max-w-lg space-y-3 p-6">
      <h2 className="text-lg font-medium">無法載入此頁</h2>
      <p className="text-sm text-muted">
        系統發生錯誤，請重新整理或稍後再試。若問題持續，請聯絡管理員。
      </p>
      <button type="button" onClick={reset} className="btn-secondary text-sm">
        重試
      </button>
    </div>
  );
}
