"use client";

import { useActionState } from "react";
import {
  deleteTemplateTaskAction,
  saveTemplateTaskAction,
  type TemplateTaskActionState,
} from "@/template-tasks/actions";
import { type StoredTemplateTask } from "@/template-tasks/manage";

const initial: TemplateTaskActionState = { ok: false, message: "" };

function tiersSummary(task: StoredTemplateTask): string {
  if (task.tiers.length === 0) {
    return "—";
  }
  return task.tiers
    .map((tier) => `滿${tier.minClicks}→${tier.bonusAmount}`)
    .join("、");
}

export function TemplateTaskAdminPanel({
  storeId,
  tasks,
  suggestions,
}: {
  storeId: string;
  tasks: StoredTemplateTask[];
  suggestions: string[];
}) {
  const [saveState, saveAction, savePending] = useActionState(
    saveTemplateTaskAction,
    initial
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteTemplateTaskAction,
    initial
  );

  return (
    <div className="flex flex-col gap-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">新增／更新</h2>
        <p className="text-sm text-zinc-500">
          品項名須與 iCHEF
          注記分析完全一致。單筆任務獎金與任務達標可並行；至少設一種。任務達標為累加階梯（滿
          10 發 A、滿 20 再加 B）。
        </p>
        <form action={saveAction} className="flex flex-col gap-3 sm:max-w-md">
          <input type="hidden" name="storeId" value={storeId} />
          <label className="flex flex-col gap-1 text-sm">
            <span>品項名</span>
            <input
              name="itemName"
              list="note-item-suggestions"
              required
              className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-600"
              placeholder="例如 修女貪杯"
              autoComplete="off"
            />
          </label>
          <datalist id="note-item-suggestions">
            {suggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <label className="flex flex-col gap-1 text-sm">
            <span>單筆任務獎金（可 0）</span>
            <input
              name="amountPerClick"
              type="number"
              min={0}
              step="any"
              defaultValue={0}
              className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-600"
              placeholder="50"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>任務達標階梯（可空白）</span>
            <textarea
              name="tiersText"
              rows={3}
              className="rounded border border-zinc-300 bg-transparent px-3 py-2 font-mono text-sm dark:border-zinc-600"
              placeholder={"10:500\n20:300"}
            />
            <span className="text-xs text-zinc-500">
              每行「門檻:金額」，例如 10:500
            </span>
          </label>
          <button
            type="submit"
            disabled={savePending}
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {savePending ? "儲存中…" : "儲存模板任務"}
          </button>
          {saveState.message ? (
            <p
              role="status"
              className={
                saveState.ok
                  ? "text-sm text-emerald-700"
                  : "text-sm text-red-700"
              }
            >
              {saveState.message}
            </p>
          ) : null}
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">已設模板任務</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-zinc-500">
            尚未設定。未綁定的注記點選獎金為 0。
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-300">
                  <th className="py-2 pr-3 font-medium">品項名</th>
                  <th className="py-2 pr-3 font-medium">單筆</th>
                  <th className="py-2 pr-3 font-medium">任務達標</th>
                  <th className="py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b border-zinc-200">
                    <td className="py-2 pr-3">{task.itemName}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {task.amountPerClick.toLocaleString("zh-TW")}
                    </td>
                    <td className="py-2 pr-3 text-xs sm:text-sm">
                      {tiersSummary(task)}
                    </td>
                    <td className="py-2">
                      <form action={deleteAction}>
                        <input type="hidden" name="storeId" value={storeId} />
                        <input
                          type="hidden"
                          name="itemName"
                          value={task.itemName}
                        />
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

export function TemplateTaskReadOnlyList({
  tasks,
}: {
  tasks: StoredTemplateTask[];
}) {
  if (tasks.length === 0) {
    return <p className="text-sm text-zinc-500">尚未設定模板任務。</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[24rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-300">
            <th className="py-2 pr-3 font-medium">品項名</th>
            <th className="py-2 pr-3 font-medium">單筆</th>
            <th className="py-2 font-medium">任務達標</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="border-b border-zinc-200">
              <td className="py-2 pr-3">{task.itemName}</td>
              <td className="py-2 pr-3 tabular-nums">
                {task.amountPerClick.toLocaleString("zh-TW")}
              </td>
              <td className="py-2">{tiersSummary(task)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
