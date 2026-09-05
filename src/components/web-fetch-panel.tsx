"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { ActionStatus } from "@/components/action-status";
import { formatTaipeiDateTime } from "@/lib/format-datetime";
import { toUserFacingMessage } from "@/lib/user-facing-error";
import type { WebFetchProgress } from "@/web-fetch/manage";
import {
  startWebFetchAction,
  type WebFetchActionState,
} from "@/web-fetch/actions";

const initial: WebFetchActionState = { ok: false, message: "" };

function formatWhen(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }
  const at = typeof value === "string" ? new Date(value) : value;
  return formatTaipeiDateTime(at);
}

function statusLabel(status: WebFetchProgress["status"]): string {
  switch (status) {
    case "RUNNING":
      return "進行中";
    case "SUCCEEDED":
      return "上次成功";
    case "FAILED":
      return "上次失敗";
    default:
      return "尚未取數";
  }
}

export function WebFetchPanel({
  storeId,
  periodKey,
  progress,
  locked,
  isAdmin,
}: {
  storeId: string;
  periodKey: string;
  progress: WebFetchProgress;
  locked: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(startWebFetchAction, initial);
  const running = progress.status === "RUNNING";

  useEffect(() => {
    if (!running) {
      return;
    }
    const id = window.setInterval(() => {
      router.refresh();
    }, 5000);
    return () => window.clearInterval(id);
  }, [running, router]);

  const canStart = isAdmin && !locked && !running && !pending;

  return (
    <section className="space-y-2 rounded border border-zinc-200 p-4 dark:border-zinc-700">
      <h2 className="text-base font-medium">網頁取數</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        從 iCHEF
        營業報表拉結帳、打卡、注記分析全品項。全到齊才取代本期匯入；失敗保留上次成功檔案。
      </p>
      <dl className="grid gap-1 text-sm">
        <div className="flex gap-2">
          <dt className="text-zinc-500">本期</dt>
          <dd>{periodKey}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-zinc-500">狀態</dt>
          <dd>{statusLabel(progress.status)}</dd>
        </div>
        {progress.rangeStart && progress.rangeEnd ? (
          <div className="flex gap-2">
            <dt className="text-zinc-500">檔案區間</dt>
            <dd>
              {progress.rangeStart}～{progress.rangeEnd}
            </dd>
          </div>
        ) : null}
        {formatWhen(progress.startedAt) ? (
          <div className="flex gap-2">
            <dt className="text-zinc-500">開始</dt>
            <dd>{formatWhen(progress.startedAt)}</dd>
          </div>
        ) : null}
        {formatWhen(progress.finishedAt) ? (
          <div className="flex gap-2">
            <dt className="text-zinc-500">結束</dt>
            <dd>{formatWhen(progress.finishedAt)}</dd>
          </div>
        ) : null}
      </dl>
      {progress.errorMessage ? (
        <ActionStatus
          ok={false}
          message={toUserFacingMessage(
            new Error(progress.errorMessage),
            "上次取數失敗，請稍後再試。"
          )}
        />
      ) : null}
      {running ? (
        <p className="text-sm text-amber-800 dark:text-amber-200">
          取數進行中…此頁每 5 秒自動更新。
        </p>
      ) : null}
      {canStart ? (
        <form action={action}>
          <input type="hidden" name="storeId" value={storeId} />
          <input type="hidden" name="periodKey" value={periodKey} />
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? "啟動中…" : "開始網頁取數"}
          </button>
        </form>
      ) : null}
      {locked && isAdmin ? (
        <p className="text-xs text-zinc-500">本期已鎖定，請先解鎖再取數。</p>
      ) : null}
      {!isAdmin && !running ? (
        <p className="text-xs text-zinc-500">僅 Admin 可發動取數。</p>
      ) : null}
      {state.message ? (
        <ActionStatus ok={state.ok} message={state.message} />
      ) : null}
    </section>
  );
}
