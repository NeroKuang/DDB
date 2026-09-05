"use client";

import { useActionState } from "react";
import {
  updateStoreDefaultCommissionRateAction,
  type StoreSettingsActionState,
} from "@/staff/store-settings-actions";

const initial: StoreSettingsActionState = { ok: false, message: "" };

export function StoreCommissionDefaultPanel({
  storeId,
  defaultCommissionRate,
}: {
  storeId: string;
  defaultCommissionRate: number;
}) {
  const [state, action, pending] = useActionState(
    updateStoreDefaultCommissionRateAction,
    initial
  );

  return (
    <section className="card-surface space-y-2 p-4">
      <h2 className="text-base font-medium">新進店員預設業績成數</h2>
      <p className="text-xs text-muted">
        新增店員表單的預填值；既有店員不受影響。常態抽成＝業績 ×
        此成數（結帳與注記列表皆同）。
      </p>
      <form action={action} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="storeId" value={storeId} />
        <label className="flex flex-col gap-1 text-sm">
          <span>預設成數（0～1，例 0.2＝20%）</span>
          <input
            name="defaultCommissionRate"
            type="number"
            min={0}
            max={1}
            step="0.01"
            defaultValue={defaultCommissionRate}
            className="field-input w-28"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="btn-secondary px-3 py-2 text-sm disabled:opacity-60"
        >
          {pending ? "儲存中…" : "儲存預設"}
        </button>
      </form>
      {state.message ? (
        <p
          role="status"
          className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}
        >
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
