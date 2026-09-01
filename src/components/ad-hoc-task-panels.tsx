"use client";

import { useActionState } from "react";
import {
  createAdHocTaskAction,
  deleteAdHocTaskAction,
  type AdHocTaskActionState,
} from "@/ad-hoc-tasks/actions";
import type { StoredAdHocTask } from "@/ad-hoc-tasks/manage";

const initial: AdHocTaskActionState = { ok: false, message: "" };

export type StaffOption = {
  id: string;
  primaryNickname: string;
  legalName: string;
};

export function AdHocTaskAdminPanel({
  storeId,
  periodKey,
  periodLabel,
  staffOptions,
  tasks,
}: {
  storeId: string;
  periodKey: string;
  periodLabel: string;
  staffOptions: StaffOption[];
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
          不綁 iCHEF 注記。指定店員、名稱與金額後計入該期任務獎金。目前期間：
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
              placeholder="例如 活動加碼"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>金額</span>
            <input
              name="amount"
              type="number"
              min={0.01}
              step="any"
              required
              className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-600"
              placeholder="1000"
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
            <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-300">
                  <th className="py-2 pr-3 font-medium">暱稱</th>
                  <th className="py-2 pr-3 font-medium">名稱</th>
                  <th className="py-2 pr-3 font-medium">金額</th>
                  <th className="py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b border-zinc-200">
                    <td className="py-2 pr-3">{task.primaryNickname}</td>
                    <td className="py-2 pr-3">{task.name}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {task.amount.toLocaleString("zh-TW")}
                    </td>
                    <td className="py-2">
                      <form action={deleteAction}>
                        <input type="hidden" name="id" value={task.id} />
                        <button
                          type="submit"
                          disabled={deletePending}
                          className="text-sm underline underline-offset-2 disabled:opacity-60"
                        >
                          刪除
                        </button>
                      </form>
                    </td>
                  </tr>
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

export function AdHocTaskReadOnlyList({ tasks }: { tasks: StoredAdHocTask[] }) {
  if (tasks.length === 0) {
    return <p className="text-sm text-zinc-500">本期沒有追加任務。</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[24rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-300">
            <th className="py-2 pr-3 font-medium">暱稱</th>
            <th className="py-2 pr-3 font-medium">名稱</th>
            <th className="py-2 font-medium">金額</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="border-b border-zinc-200">
              <td className="py-2 pr-3">{task.primaryNickname}</td>
              <td className="py-2 pr-3">{task.name}</td>
              <td className="py-2 tabular-nums">
                {task.amount.toLocaleString("zh-TW")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
