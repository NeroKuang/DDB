"use client";

import { useActionState, useState } from "react";
import {
  deleteTemplateTaskAction,
  saveTemplateTaskAction,
  type TemplateTaskActionState,
} from "@/template-tasks/actions";
import { type StoredTemplateTask } from "@/template-tasks/manage";

const initial: TemplateTaskActionState = { ok: false, message: "" };

type TierDraft = { minClicks: string; bonusAmount: string };

function tiersSummary(task: StoredTemplateTask): string {
  if (task.tiers.length === 0) {
    return "—";
  }
  return task.tiers
    .map(
      (tier) =>
        `點滿 ${tier.minClicks} 次加發 ${tier.bonusAmount.toLocaleString("zh-TW")}`
    )
    .join("；");
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
  const [tierRows, setTierRows] = useState<TierDraft[]>([
    { minClicks: "", bonusAmount: "" },
    { minClicks: "", bonusAmount: "" },
  ]);

  return (
    <div className="flex flex-col gap-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">新增／更新</h2>
        <div className="space-y-2 text-sm text-zinc-500">
          <p>
            品項名須與 iCHEF
            注記分析完全一致。單筆任務獎金與任務達標可並行；至少設一種。
          </p>
          <p>
            任務達標怎麼記：每一階是「點選數達到該門檻，就加發該階金額」，而且會累加，不是只領最高那一階。例如設「滿
            10 次加發 500」「滿 20 次加發 300」：某人點 20 次 →
            任務達標＝500＋300＝800；點 15 次 → 只拿 500；點 9 次 →
            0。再與單筆（點選數 × 單筆任務獎金）加總。
          </p>
        </div>
        <form action={saveAction} className="flex flex-col gap-3 sm:max-w-lg">
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

          <fieldset className="space-y-3 rounded border border-zinc-300 p-3 dark:border-zinc-600">
            <legend className="px-1 text-sm font-medium">
              任務達標階梯（可空白）
            </legend>
            <p className="text-xs text-zinc-500">
              左欄填點選門檻（數量），右欄填達成後加發的金額。留空的列會忽略。儲存時會整份覆蓋該品項既有階梯。
            </p>
            <div className="space-y-2">
              {tierRows.map((row, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_1fr_auto] items-end gap-2"
                >
                  <label className="flex flex-col gap-1 text-sm">
                    <span>點選門檻</span>
                    <input
                      name="tierMinClicks"
                      type="number"
                      min={1}
                      step={1}
                      value={row.minClicks}
                      onChange={(event) => {
                        const next = [...tierRows];
                        next[index] = {
                          ...next[index]!,
                          minClicks: event.target.value,
                        };
                        setTierRows(next);
                      }}
                      className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-600"
                      placeholder="10"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span>加發金額</span>
                    <input
                      name="tierBonusAmount"
                      type="number"
                      min={0.01}
                      step="any"
                      value={row.bonusAmount}
                      onChange={(event) => {
                        const next = [...tierRows];
                        next[index] = {
                          ...next[index]!,
                          bonusAmount: event.target.value,
                        };
                        setTierRows(next);
                      }}
                      className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-600"
                      placeholder="500"
                    />
                  </label>
                  <button
                    type="button"
                    className="mb-0.5 text-sm underline underline-offset-2 disabled:opacity-40"
                    disabled={tierRows.length <= 1}
                    onClick={() =>
                      setTierRows(tierRows.filter((_, i) => i !== index))
                    }
                  >
                    移除
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="text-sm underline underline-offset-2"
              onClick={() =>
                setTierRows([...tierRows, { minClicks: "", bonusAmount: "" }])
              }
            >
              新增一階
            </button>
          </fieldset>

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
        <p className="text-xs text-zinc-500">
          任務達標欄位為累加制：列出的每一階，只要點選數達門檻就加發該金額。
        </p>
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
                  <th className="py-2 pr-3 font-medium">任務達標（累加）</th>
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
      <p className="mb-2 text-xs text-zinc-500">
        任務達標為累加制：點選數達某一階門檻就加發該階金額，不是只領最高階。
      </p>
      <table className="w-full min-w-[24rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-300">
            <th className="py-2 pr-3 font-medium">品項名</th>
            <th className="py-2 pr-3 font-medium">單筆</th>
            <th className="py-2 font-medium">任務達標（累加）</th>
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
