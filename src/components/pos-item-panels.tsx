"use client";

import { useActionState } from "react";
import { ListToolbar } from "@/components/list-toolbar";
import { useClientList } from "@/components/use-client-list";
import {
  deletePosItemAction,
  importPosItemPricesAction,
  savePosItemPriceAction,
  syncPosItemsAction,
  togglePosItemGiftAction,
  type PosItemActionState,
} from "@/pos-items/actions";
import type { PosItemHealth } from "@/pos-items/health";
import type { StoredPosItem } from "@/pos-items/manage";
import { formatTaipeiDateTime } from "@/lib/format-datetime";

const initial: PosItemActionState = { ok: false, message: "" };

function formatMoney(value: number): string {
  return value.toLocaleString("zh-TW", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function posItemHaystack(item: StoredPosItem): string {
  return item.name;
}

function PosItemHealthBanner({ health }: { health: PosItemHealth }) {
  if (health.total === 0) {
    return null;
  }
  if (health.allBillableZero) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
      >
        <p className="font-medium">所有非贈送品售價皆為 0</p>
        <p className="mt-1 [word-break:keep-all] text-pretty">
          {health.suggestion}
        </p>
      </div>
    );
  }
  if (health.zeroPriceBillableCount > 0) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
      >
        <p className="font-medium">
          {health.zeroPriceBillableCount} 個非贈送品未設定售價
        </p>
        <p className="mt-1 [word-break:keep-all] text-pretty">
          {health.suggestion}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {health.zeroPriceBillable.slice(0, 10).map((item) => (
            <span
              key={item.id}
              title={item.name}
              className="inline-block max-w-[11rem] truncate whitespace-nowrap rounded-md bg-amber-100/90 px-2 py-0.5 text-xs text-amber-950"
            >
              {item.name}
            </span>
          ))}
          {health.zeroPriceBillableCount > 10 ? (
            <span className="inline-flex items-center rounded-md bg-amber-100/60 px-2 py-0.5 text-xs text-amber-900">
              +{health.zeroPriceBillableCount - 10} 個
            </span>
          ) : null}
        </div>
      </div>
    );
  }
  return null;
}

function PosItemTable({
  storeId,
  items,
  editable,
}: {
  storeId: string;
  items: StoredPosItem[];
  editable: boolean;
}) {
  const [saveState, saveAction, savePending] = useActionState(
    savePosItemPriceAction,
    initial
  );
  const [giftState, giftAction, giftPending] = useActionState(
    togglePosItemGiftAction,
    initial
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deletePosItemAction,
    initial
  );
  const list = useClientList({
    items,
    getSearchHaystack: posItemHaystack,
  });

  return (
    <div className="space-y-3">
      <ListToolbar
        query={list.query}
        onQueryChange={list.setQuery}
        searchLabel="搜尋品項"
        searchPlaceholder="品項名"
        pageSize={list.pageSize}
        onPageSizeChange={list.setPageSize}
        page={list.page}
        onPageChange={list.setPage}
        pages={list.pages}
        filteredCount={list.filteredCount}
        totalCount={list.totalCount}
      />
      {saveState.message ? (
        <p
          role="status"
          className={`text-sm ${saveState.ok ? "text-emerald-700" : "text-red-700"}`}
        >
          {saveState.message}
        </p>
      ) : null}
      {giftState.message && giftState.message !== saveState.message ? (
        <p
          role="status"
          className={`text-sm ${giftState.ok ? "text-emerald-700" : "text-red-700"}`}
        >
          {giftState.message}
        </p>
      ) : null}
      {deleteState.message &&
      deleteState.message !== saveState.message &&
      deleteState.message !== giftState.message ? (
        <p
          role="status"
          className={`text-sm ${deleteState.ok ? "text-emerald-700" : "text-red-700"}`}
        >
          {deleteState.message}
        </p>
      ) : null}
      {list.filteredCount === 0 ? (
        <p className="text-sm text-zinc-500">沒有符合的品項。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-300">
                <th className="min-w-[9rem] py-2 pr-3 font-medium">品項名</th>
                <th className="whitespace-nowrap py-2 pr-3 font-medium">
                  類型
                </th>
                <th className="whitespace-nowrap py-2 pr-3 font-medium">
                  POS 售價
                </th>
                <th className="whitespace-nowrap py-2 pr-3 font-medium">
                  最近偵測
                </th>
                {editable ? (
                  <th className="whitespace-nowrap py-2 font-medium">操作</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {list.pageItems.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-zinc-200 align-top"
                >
                  <td className="max-w-[14rem] py-2 pr-3 [word-break:keep-all] leading-snug">
                    {item.name}
                  </td>
                  <td className="whitespace-nowrap py-2 pr-3">
                    {item.isGift ? (
                      <span className="inline-block whitespace-nowrap rounded bg-sky-100 px-2 py-0.5 text-xs text-sky-900">
                        贈送品
                      </span>
                    ) : (
                      <span className="whitespace-nowrap text-xs text-zinc-500">
                        一般
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap py-2 pr-3">
                    {editable && !item.isGift ? (
                      <form
                        action={saveAction}
                        className="inline-flex items-center gap-2"
                      >
                        <input type="hidden" name="storeId" value={storeId} />
                        <input type="hidden" name="itemId" value={item.id} />
                        <input
                          name="unitPrice"
                          type="number"
                          min={0}
                          step={1}
                          defaultValue={item.unitPrice}
                          className="field-input w-24 tabular-nums"
                          aria-label={`${item.name} 售價`}
                        />
                        <button
                          type="submit"
                          disabled={savePending}
                          className="whitespace-nowrap text-sm underline underline-offset-2 disabled:opacity-60"
                        >
                          儲存
                        </button>
                      </form>
                    ) : (
                      <span className="tabular-nums">
                        {formatMoney(item.unitPrice)}
                      </span>
                    )}
                    {!item.isGift && item.unitPrice === 0 ? (
                      <span className="mt-0.5 block text-xs text-amber-700">
                        未設定
                      </span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap py-2 pr-3 text-xs text-zinc-500">
                    {formatTaipeiDateTime(item.lastSeenAt) ?? "—"}
                  </td>
                  {editable ? (
                    <td className="whitespace-nowrap py-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <form action={giftAction} className="inline">
                          <input type="hidden" name="storeId" value={storeId} />
                          <input type="hidden" name="itemId" value={item.id} />
                          <input
                            type="hidden"
                            name="isGift"
                            value={item.isGift ? "false" : "true"}
                          />
                          <button
                            type="submit"
                            disabled={giftPending}
                            className="whitespace-nowrap text-sm underline underline-offset-2 disabled:opacity-60"
                          >
                            {item.isGift ? "改一般" : "標贈送"}
                          </button>
                        </form>
                        <form action={deleteAction} className="inline">
                          <input type="hidden" name="storeId" value={storeId} />
                          <input type="hidden" name="itemId" value={item.id} />
                          <button
                            type="submit"
                            disabled={deletePending}
                            className="whitespace-nowrap text-sm underline underline-offset-2 disabled:opacity-60"
                          >
                            刪除
                          </button>
                        </form>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function PosItemAdminPanel({
  storeId,
  periodKey,
  items,
  health,
}: {
  storeId: string;
  periodKey: string;
  items: StoredPosItem[];
  health: PosItemHealth;
}) {
  const [syncState, syncAction, syncPending] = useActionState(
    syncPosItemsAction,
    initial
  );
  const [importState, importAction, importPending] = useActionState(
    importPosItemPricesAction,
    initial
  );

  return (
    <div className="flex flex-col gap-6">
      <PosItemHealthBanner health={health} />

      <section className="card-surface space-y-3 p-4">
        <h2 className="text-base font-medium">售價匯入（一次性）</h2>
        <p className="text-sm text-pretty text-zinc-600 [word-break:keep-all] dark:text-zinc-400">
          從 iCHEF 外層注記分析帶入建議 POS 售價，只填目前仍為 0
          的非贈送品，不覆寫已設定售價。
        </p>
        <p className="text-sm text-zinc-500">之後以本頁品項主檔為準。</p>
        <form
          action={importAction}
          className="flex flex-wrap items-center gap-3"
        >
          <input type="hidden" name="storeId" value={storeId} />
          <input type="hidden" name="periodKey" value={periodKey} />
          <button
            type="submit"
            disabled={importPending}
            className="btn-secondary px-3 py-2 text-sm disabled:opacity-60"
          >
            {importPending ? "匯入中…" : "從匯入建議售價"}
          </button>
        </form>
        {importState.message ? (
          <p
            role="status"
            className={`text-sm ${importState.ok ? "text-emerald-700" : "text-red-700"}`}
          >
            {importState.message}
          </p>
        ) : null}
      </section>

      <section className="card-surface space-y-3 p-4">
        <h2 className="text-base font-medium">自動偵測品項</h2>
        <p className="text-sm text-pretty text-zinc-600 [word-break:keep-all] dark:text-zinc-400">
          從本期 iCHEF
          匯入的注記明細讀取品項名稱；已存在者只更新偵測時間，不覆寫售價。
        </p>
        <p className="text-sm text-zinc-500">
          名稱含「兌換」「贈送」者自動標為贈送品。
        </p>
        <form action={syncAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="storeId" value={storeId} />
          <input type="hidden" name="periodKey" value={periodKey} />
          <button
            type="submit"
            disabled={syncPending}
            className="btn-secondary px-3 py-2 text-sm disabled:opacity-60"
          >
            {syncPending ? "偵測中…" : "從本期匯入偵測品項"}
          </button>
        </form>
        {syncState.message ? (
          <p
            role="status"
            className={`text-sm ${syncState.ok ? "text-emerald-700" : "text-red-700"}`}
          >
            {syncState.message}
          </p>
        ) : null}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">品項清單</h2>
        <p className="text-sm text-zinc-500">
          業績面注記列表的「售價／總賣出／常態抽成」依此 POS 售價計算。
          {health.giftCount > 0
            ? ` 已標記 ${health.giftCount} 個兌換／贈送品。`
            : null}
        </p>
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500">
            尚無品項，請先執行網頁取數或上傳，再按「從本期匯入偵測品項」。
          </p>
        ) : (
          <PosItemTable storeId={storeId} items={items} editable />
        )}
      </section>
    </div>
  );
}

export function PosItemReadOnlyList({
  items,
  health,
}: {
  items: StoredPosItem[];
  health: PosItemHealth;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">尚無品項主檔。</p>;
  }
  return (
    <div className="space-y-3">
      <PosItemHealthBanner health={health} />
      <PosItemTable storeId="" items={items} editable={false} />
    </div>
  );
}
