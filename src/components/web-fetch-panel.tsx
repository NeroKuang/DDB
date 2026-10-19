"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { ActionStatus } from "@/components/action-status";
import { formatTaipeiDateTime } from "@/lib/format-datetime";
import { toUserFacingMessage } from "@/lib/user-facing-error";
import type { WebFetchProgress } from "@/web-fetch/manage";
import {
  startWebFetchAction,
  type WebFetchActionState,
} from "@/web-fetch/actions";

const initial: WebFetchActionState = { ok: false, message: "" };

type ProgressPayload = {
  periodKey: string;
  status: WebFetchProgress["status"];
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  rangeStart: string | null;
  rangeEnd: string | null;
};

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
  const [live, setLive] = useState<ProgressPayload | null>(null);
  const wasRunning = useRef(progress.status === "RUNNING");

  const view: ProgressPayload = live ?? {
    periodKey: progress.periodKey,
    status: progress.status,
    startedAt: progress.startedAt?.toISOString() ?? null,
    finishedAt: progress.finishedAt?.toISOString() ?? null,
    errorMessage: progress.errorMessage,
    rangeStart: progress.rangeStart,
    rangeEnd: progress.rangeEnd,
  };
  const running = view.status === "RUNNING";

  useEffect(() => {
    setLive(null);
    wasRunning.current = progress.status === "RUNNING";
  }, [periodKey, progress.status, progress.finishedAt]);

  useEffect(() => {
    if (!running) {
      return;
    }
    let cancelled = false;

    const poll = async () => {
      if (document.hidden) {
        return;
      }
      try {
        const params = new URLSearchParams({ storeId, periodKey });
        const res = await fetch(`/api/web-fetch/progress?${params}`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) {
          return;
        }
        const data = (await res.json()) as ProgressPayload;
        if (cancelled) {
          return;
        }
        setLive(data);
        if (data.status !== "RUNNING" && wasRunning.current) {
          wasRunning.current = false;
          router.refresh();
        }
        wasRunning.current = data.status === "RUNNING";
      } catch {
        // ignore transient poll errors
      }
    };

    void poll();
    const id = window.setInterval(() => {
      void poll();
    }, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [running, storeId, periodKey, router]);

  const canStart = isAdmin && !locked && !running && !pending;

  return (
    <section className="card-surface space-y-2 p-4">
      <h2 className="text-base font-medium">網頁取數</h2>
      <p className="text-sm text-muted">
        從 iCHEF
        營業報表拉結帳、打卡、注記分析全品項。全到齊才取代本期匯入；失敗保留上次成功檔案。
      </p>
      <dl className="grid gap-1 text-sm">
        <div className="flex gap-2">
          <dt className="text-muted">本期</dt>
          <dd>{periodKey}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted">狀態</dt>
          <dd>{statusLabel(view.status)}</dd>
        </div>
        {view.rangeStart && view.rangeEnd ? (
          <div className="flex gap-2">
            <dt className="text-muted">檔案區間</dt>
            <dd>
              {view.rangeStart}～{view.rangeEnd}
            </dd>
          </div>
        ) : null}
        {formatWhen(view.startedAt) ? (
          <div className="flex gap-2">
            <dt className="text-muted">開始</dt>
            <dd>{formatWhen(view.startedAt)}</dd>
          </div>
        ) : null}
        {formatWhen(view.finishedAt) ? (
          <div className="flex gap-2">
            <dt className="text-muted">結束</dt>
            <dd>{formatWhen(view.finishedAt)}</dd>
          </div>
        ) : null}
      </dl>
      {view.errorMessage ? (
        <ActionStatus
          ok={false}
          message={toUserFacingMessage(
            new Error(view.errorMessage),
            "上次取數失敗，請稍後再試。"
          )}
        />
      ) : null}
      {running ? (
        <p className="text-sm text-muted">
          取數進行中…進度約每 10 秒更新（不重載整頁）。
        </p>
      ) : null}
      {canStart ? (
        <form action={action}>
          <input type="hidden" name="storeId" value={storeId} />
          <input type="hidden" name="periodKey" value={periodKey} />
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "啟動中…" : "開始網頁取數"}
          </button>
        </form>
      ) : null}
      {locked && isAdmin ? (
        <p className="text-xs text-muted">本期已鎖定，請先解鎖再取數。</p>
      ) : null}
      {!isAdmin && !running ? (
        <p className="text-xs text-muted">僅 Admin 可發動取數。</p>
      ) : null}
      {state.message ? (
        <ActionStatus ok={state.ok} message={state.message} />
      ) : null}
    </section>
  );
}
