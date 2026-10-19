"use client";

import { useActionState } from "react";
import {
  BUILTIN_FIELD_LABELS,
  BUILTIN_ROLLUP_FIELD_KEYS,
  ROLLUP_LABELS,
} from "@/compile/default-rollups";
import type { Rollup } from "@/compile/types";
import {
  archiveCustomItemAction,
  createCustomItemAction,
  saveDemeritUnitAction,
  savePeriodBoundsAction,
  saveRollupsAction,
  updateCustomItemAction,
  type StoreSettingsActionState,
} from "@/store-settings/actions";
import type { StoreSettingsView } from "@/store-settings/manage";

const initial: StoreSettingsActionState = { ok: false, message: "" };

const ROLLUP_OPTIONS = Object.entries(ROLLUP_LABELS) as [Rollup, string][];

function StatusLine({ state }: { state: StoreSettingsActionState }) {
  if (!state.message) {
    return null;
  }
  return (
    <p
      role="status"
      className={`text-sm ${state.ok ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
    >
      {state.message}
    </p>
  );
}

export function StoreSettingsPanel({
  settings,
  periodKey,
  periodBounds,
  isAdmin,
}: {
  settings: StoreSettingsView;
  periodKey: string;
  periodBounds: {
    startIso: string;
    endIso: string;
    isOverride: boolean;
  };
  isAdmin: boolean;
}) {
  const [demeritState, demeritAction, demeritPending] = useActionState(
    saveDemeritUnitAction,
    initial
  );
  const [rollupState, rollupAction, rollupPending] = useActionState(
    saveRollupsAction,
    initial
  );
  const [createState, createAction, createPending] = useActionState(
    createCustomItemAction,
    initial
  );
  const [boundsState, boundsAction, boundsPending] = useActionState(
    savePeriodBoundsAction,
    initial
  );

  if (!isAdmin) {
    return (
      <p className="text-sm text-muted">
        僅 Admin 可修改門市設定（唯讀預覽）。
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card-surface space-y-3 p-4">
        <h2 className="text-base font-medium">單點金額</h2>
        <p className="text-xs text-muted">
          記點 × 單點金額＝應扣原始數字。預設 230。
        </p>
        <form action={demeritAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="storeId" value={settings.storeId} />
          <label className="flex flex-col gap-0.5 text-xs">
            單點金額
            <input
              name="demeritUnitAmount"
              type="number"
              step="any"
              min={0}
              defaultValue={settings.demeritUnitAmount}
              className="field-input w-40"
              required
            />
          </label>
          <button
            type="submit"
            disabled={demeritPending}
            className="btn-primary"
          >
            {demeritPending ? "儲存中…" : "儲存"}
          </button>
        </form>
        <StatusLine state={demeritState} />
      </section>

      <section className="card-surface space-y-3 p-4">
        <h2 className="text-base font-medium">加總歸屬</h2>
        <p className="text-xs text-muted">
          全門市一份。決定各薪資項目如何進入當月薪資／應領。
        </p>
        <form action={rollupAction} className="space-y-3">
          <input type="hidden" name="storeId" value={settings.storeId} />
          <div className="grid gap-2 sm:grid-cols-2">
            {BUILTIN_ROLLUP_FIELD_KEYS.map((key) => (
              <label key={key} className="flex flex-col gap-0.5 text-xs">
                {BUILTIN_FIELD_LABELS[key]}
                <select
                  name={`rollup_${key}`}
                  defaultValue={settings.rollups[key]}
                  className="field-input"
                >
                  {ROLLUP_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={rollupPending}
            className="btn-primary"
          >
            {rollupPending ? "儲存中…" : "儲存加總歸屬"}
          </button>
        </form>
        <StatusLine state={rollupState} />
      </section>

      <section className="card-surface space-y-3 p-4">
        <h2 className="text-base font-medium">自訂薪資項目</h2>
        <p className="text-xs text-muted">
          原始數字恆為 0；在薪資列 popout 填儲存值。封存後不再出現於新編成。
        </p>
        <ul className="space-y-3">
          {settings.customItems.map((item) => (
            <li
              key={item.id}
              className="rounded border border-[var(--border)] p-3"
            >
              <CustomItemRow
                storeId={settings.storeId}
                id={item.id}
                name={item.name}
                rollup={item.rollup}
              />
            </li>
          ))}
          {settings.customItems.length === 0 ? (
            <li className="text-sm text-muted">尚無自訂項目。</li>
          ) : null}
        </ul>
        <form
          action={createAction}
          className="flex flex-wrap items-end gap-3 border-t border-[var(--border)] pt-3"
        >
          <input type="hidden" name="storeId" value={settings.storeId} />
          <label className="flex flex-col gap-0.5 text-xs">
            名稱
            <input name="name" className="field-input w-48" required />
          </label>
          <label className="flex flex-col gap-0.5 text-xs">
            加總歸屬
            <select
              name="rollup"
              defaultValue="addToMonthlyPay"
              className="field-input"
            >
              {ROLLUP_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={createPending}
            className="btn-primary"
          >
            {createPending ? "新增中…" : "新增"}
          </button>
        </form>
        <StatusLine state={createState} />
      </section>

      <section className="card-surface space-y-3 p-4">
        <h2 className="text-base font-medium">本期營業日起訖</h2>
        <p className="text-xs text-muted">
          期間 {periodKey}
          {periodBounds.isOverride ? "（已覆寫日曆月預設）" : "（日曆月預設）"}
          。兩個中午（ISO）。改完後需重新網頁取數／重算才會對齊匯入篩選。
        </p>
        <form action={boundsAction} className="space-y-3">
          <input type="hidden" name="storeId" value={settings.storeId} />
          <input type="hidden" name="periodKey" value={periodKey} />
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-0.5 text-xs">
              起（ISO）
              <input
                name="startIso"
                defaultValue={periodBounds.startIso}
                className="field-input font-mono text-xs"
                required
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs">
              迄（ISO）
              <input
                name="endIso"
                defaultValue={periodBounds.endIso}
                className="field-input font-mono text-xs"
                required
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={boundsPending}
              className="btn-primary"
            >
              {boundsPending ? "儲存中…" : "儲存起訖"}
            </button>
            <button
              type="submit"
              name="reset"
              value="1"
              disabled={boundsPending}
              className="btn-secondary"
            >
              恢復日曆月預設
            </button>
          </div>
        </form>
        <StatusLine state={boundsState} />
      </section>
    </div>
  );
}

function CustomItemRow({
  storeId,
  id,
  name,
  rollup,
}: {
  storeId: string;
  id: string;
  name: string;
  rollup: Rollup;
}) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateCustomItemAction,
    initial
  );
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveCustomItemAction,
    initial
  );
  return (
    <div className="space-y-2">
      <form action={updateAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="storeId" value={storeId} />
        <input type="hidden" name="id" value={id} />
        <label className="flex flex-col gap-0.5 text-xs">
          名稱
          <input
            name="name"
            defaultValue={name}
            className="field-input w-40"
            required
          />
        </label>
        <label className="flex flex-col gap-0.5 text-xs">
          加總歸屬
          <select name="rollup" defaultValue={rollup} className="field-input">
            {ROLLUP_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={updatePending}
          className="btn-secondary"
        >
          {updatePending ? "…" : "更新"}
        </button>
      </form>
      <form action={archiveAction}>
        <input type="hidden" name="storeId" value={storeId} />
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          disabled={archivePending}
          className="text-xs text-[var(--danger)] underline"
        >
          {archivePending ? "封存中…" : "封存"}
        </button>
      </form>
      <StatusLine state={updateState.message ? updateState : archiveState} />
    </div>
  );
}
