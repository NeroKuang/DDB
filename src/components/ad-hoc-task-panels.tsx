"use client";

import { useActionState } from "react";
import {
  confirmAdHocTaskAction,
  createAdHocTaskAction,
  deleteAdHocTaskAction,
  type AdHocTaskActionState,
  unconfirmAdHocTaskAction,
  updateAdHocStoredAmountAction,
} from "@/ad-hoc-tasks/actions";
import type { StoredAdHocTask } from "@/ad-hoc-tasks/manage";

const initial: AdHocTaskActionState = { ok: false, message: "" };

export type StaffOption = {
  id: string;
  primaryNickname: string;
  legalName: string;
};

function formatHours(value: number | undefined): string {
  if (value === undefined) {
    return "—";
  }
  return value.toLocaleString("zh-TW", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function AdHocTaskAdminPanel({
  storeId,
  periodKey,
  periodLabel,
  staffOptions,
  staffOriginalHours,
  tasks,
}: {
  storeId: string;
  periodKey: string;
  periodLabel: string;
  staffOptions: StaffOption[];
  staffOriginalHours: Record<string, number>;
  tasks: StoredAdHocTask[];
}) {
  const [createState, createAction, createPending] = useActionState(
    createAdHocTaskAction,
    initial
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteAdHocTaskAction,
    initial
  );

  return (
    <div className="flex flex-col gap-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">新增追加任務</h2>
        <p className="text-sm text-zinc-500">
          用名稱描述老闆本期需求（滿時數、品項額外抽成、臨時獎金等）。原始金額為
          0；請在列表填儲存值並確認派發後才計入任務獎金。核對滿時數時可看該店員本期原始時數。目前期間：
          {periodLabel}（{periodKey}）。
        </p>
        <form action={createAction} className="flex flex-col gap-3 sm:max-w-md">
          <input type="hidden" name="storeId" value={storeId} />
          <input type="hidden" name="periodKey" value={periodKey} />
          <label className="flex flex-col gap-1 text-sm">
            <span>店員</span>
            <select
              name="staffId"
              required
              className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-600"
              defaultValue=""
            >
              <option value="" disabled>
                選擇店員
              </option>
              {staffOptions.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.primaryNickname}
                  {person.legalName ? `（${person.legalName}）` : ""}
                  {staffOriginalHours[person.primaryNickname] !== undefined
                    ? ` · 原始時數 ${formatHours(staffOriginalHours[person.primaryNickname])}`
                    : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>名稱</span>
            <input
              name="name"
              required
              className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-600"
              placeholder="例如 滿50小時獎金、修女貪杯額外抽成"
            />
          </label>
          <button
            type="submit"
            disabled={createPending}
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {createPending ? "新增中…" : "新增追加任務"}
          </button>
          {createState.message ? (
            <p
              role="status"
              className={
                createState.ok
                  ? "text-sm text-emerald-700"
                  : "text-sm text-red-700"
              }
            >
              {createState.message}
            </p>
          ) : null}
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">本期追加任務</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-zinc-500">尚未新增。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-300">
                  <th className="py-2 pr-3 font-medium">暱稱</th>
                  <th className="py-2 pr-3 font-medium">原始時數</th>
                  <th className="py-2 pr-3 font-medium">名稱</th>
                  <th className="py-2 pr-3 font-medium">儲存值</th>
                  <th className="py-2 pr-3 font-medium">狀態</th>
                  <th className="py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <AdHocTaskRow
                    key={task.id}
                    task={task}
                    originalHours={staffOriginalHours[task.primaryNickname]}
                    deleteAction={deleteAction}
                    deletePending={deletePending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {deleteState.message ? (
          <p
            role="status"
            className={
              deleteState.ok
                ? "text-sm text-emerald-700"
                : "text-sm text-red-700"
            }
          >
            {deleteState.message}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function AdHocTaskRow({
  task,
  originalHours,
  deleteAction,
  deletePending,
}: {
  task: StoredAdHocTask;
  originalHours: number | undefined;
  deleteAction: (payload: FormData) => void;
  deletePending: boolean;
}) {
  const [amountState, amountAction, amountPending] = useActionState(
    updateAdHocStoredAmountAction,
    initial
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmAdHocTaskAction,
    initial
  );
  const [unconfirmState, unconfirmAction, unconfirmPending] = useActionState(
    unconfirmAdHocTaskAction,
    initial
  );

  const statusMessage =
    amountState.message || confirmState.message || unconfirmState.message;
  const statusOk = amountState.message
    ? amountState.ok
    : confirmState.message
      ? confirmState.ok
      : unconfirmState.ok;

  return (
    <tr className="border-b border-zinc-200 align-top">
      <td className="py-2 pr-3">{task.primaryNickname}</td>
      <td className="py-2 pr-3 tabular-nums">{formatHours(originalHours)}</td>
      <td className="py-2 pr-3">{task.name}</td>
      <td className="py-2 pr-3">
        <form action={amountAction} className="flex items-center gap-2">
          <input type="hidden" name="id" value={task.id} />
          <input
            name="storedAmount"
            type="number"
            min={0}
            step="any"
            defaultValue={task.storedAmount}
            className="w-24 rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-600"
          />
          <button
            type="submit"
            disabled={amountPending || task.confirmed}
            className="text-xs underline underline-offset-2 disabled:opacity-60"
          >
            存
          </button>
        </form>
        <p className="mt-1 text-xs text-zinc-500">原始 0</p>
      </td>
      <td className="py-2 pr-3">
        {task.confirmed ? (
          <span className="text-emerald-700">已確認派發</span>
        ) : (
          <span className="text-zinc-500">待確認</span>
        )}
      </td>
      <td className="py-2">
        <div className="flex flex-col gap-2">
          {task.confirmed ? (
            <form action={unconfirmAction}>
              <input type="hidden" name="id" value={task.id} />
              <button
                type="submit"
                disabled={unconfirmPending}
                className="text-sm underline underline-offset-2 disabled:opacity-60"
              >
                取消確認
              </button>
            </form>
          ) : (
            <form action={confirmAction}>
              <input type="hidden" name="id" value={task.id} />
              <button
                type="submit"
                disabled={confirmPending}
                className="text-sm underline underline-offset-2 disabled:opacity-60"
              >
                確認派發
              </button>
            </form>
          )}
          <form action={deleteAction}>
            <input type="hidden" name="id" value={task.id} />
            <button
              type="submit"
              disabled={deletePending}
              className="text-sm text-red-700 underline underline-offset-2 disabled:opacity-60"
            >
              刪除
            </button>
          </form>
          {statusMessage ? (
            <p
              role="status"
              className={
                statusOk ? "text-xs text-emerald-700" : "text-xs text-red-700"
              }
            >
              {statusMessage}
            </p>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

export function AdHocTaskReadOnlyList({ tasks }: { tasks: StoredAdHocTask[] }) {
  if (tasks.length === 0) {
    return <p className="text-sm text-zinc-500">本期沒有追加任務。</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-300">
            <th className="py-2 pr-3 font-medium">暱稱</th>
            <th className="py-2 pr-3 font-medium">名稱</th>
            <th className="py-2 pr-3 font-medium">儲存值</th>
            <th className="py-2 font-medium">狀態</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="border-b border-zinc-200">
              <td className="py-2 pr-3">{task.primaryNickname}</td>
              <td className="py-2 pr-3">{task.name}</td>
              <td className="py-2 pr-3 tabular-nums">
                {task.storedAmount.toLocaleString("zh-TW")}
              </td>
              <td className="py-2">
                {task.confirmed ? "已確認派發" : "待確認"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
