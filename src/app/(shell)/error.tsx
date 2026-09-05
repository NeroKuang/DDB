"use client";

import { useEffect } from "react";
import { reportClientErrorAction } from "@/lib/report-client-error";

export default function ShellError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[shell-error]", error);
    void reportClientErrorAction({
      context: "shell-error",
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

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
