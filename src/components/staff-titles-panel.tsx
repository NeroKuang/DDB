"use client";

import { useActionState } from "react";
import { ListToolbar } from "@/components/list-toolbar";
import { useClientList } from "@/components/use-client-list";
import {
  addStaffTitleAction,
  deleteStaffTitleAction,
  type StaffTitleActionState,
} from "@/staff-titles/actions";

const initial: StaffTitleActionState = { ok: false, message: "" };

function titleHaystack(label: string): string {
  return label;
}

export function StaffTitlesPanel({
  storeId,
  titles,
  isAdmin,
}: {
  storeId: string;
  titles: string[];
  isAdmin: boolean;
}) {
  const [addState, addAction, addPending] = useActionState(
    addStaffTitleAction,
    initial
  );
  const [delState, delAction, delPending] = useActionState(
    deleteStaffTitleAction,
    initial
  );

  const list = useClientList({
    items: titles,
    getSearchHaystack: titleHaystack,
  });

  return (
    <section className="space-y-4">
      {titles.length > 0 ? (
        <>
          <ListToolbar
            query={list.query}
            onQueryChange={list.setQuery}
            searchLabel="搜尋職稱"
            searchPlaceholder="職稱名稱"
            pageSize={list.pageSize}
            onPageSizeChange={list.setPageSize}
            page={list.page}
            onPageChange={list.setPage}
            pages={list.pages}
            filteredCount={list.filteredCount}
            totalCount={list.totalCount}
          />
          {list.filteredCount === 0 ? (
            <p className="text-sm text-zinc-500">沒有符合的職稱。</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {list.pageItems.map((label) => (
                <li
                  key={label}
                  className="flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-sm dark:border-zinc-700"
                >
                  {label}
                  {isAdmin ? (
                    <form action={delAction}>
                      <input type="hidden" name="storeId" value={storeId} />
                      <input type="hidden" name="label" value={label} />
                      <button
                        type="submit"
                        disabled={delPending}
                        className="text-xs text-red-600 underline"
                        aria-label={`刪除職稱 ${label}`}
                      >
                        刪
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="text-sm text-zinc-500">尚無職稱標籤。</p>
      )}
      {isAdmin ? (
        <form action={addAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="storeId" value={storeId} />
          <label className="flex flex-col gap-1 text-sm">
            新增職稱
            <input
              name="label"
              required
              className="rounded border px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
          <button
            type="submit"
            disabled={addPending}
            className="rounded bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            新增
          </button>
        </form>
      ) : null}
      {addState.message ? (
        <p
          role="status"
          className={addState.ok ? "text-emerald-700" : "text-red-700"}
        >
          {addState.message}
        </p>
      ) : null}
      {delState.message ? (
        <p
          role="status"
          className={delState.ok ? "text-emerald-700" : "text-red-700"}
        >
          {delState.message}
        </p>
      ) : null}
    </section>
  );
}
