"use client";

import { useActionState } from "react";
import { ListToolbar } from "@/components/list-toolbar";
import { useClientList } from "@/components/use-client-list";
import type { RawRetentionGroupView } from "@/storage-retention/list-groups";
import {
  archiveRawPeriodAction,
  runStorageRetentionAction,
  type StorageRetentionActionState,
} from "@/storage-retention/actions";

const initial: StorageRetentionActionState = { ok: false, message: "" };

function retentionGroupHaystack(group: RawRetentionGroupView): string {
  return [
    group.storeName,
    group.storeCode,
    group.periodKey,
    group.policyLabel,
    group.stateLabel,
  ].join(" ");
}

function RawRetentionGroupTable({
  groups,
}: {
  groups: RawRetentionGroupView[];
}) {
  const list = useClientList({
    items: groups,
    getSearchHaystack: retentionGroupHaystack,
  });

  return (
    <div className="space-y-3">
      <ListToolbar
        query={list.query}
        onQueryChange={list.setQuery}
        searchLabel="搜尋存檔"
        searchPlaceholder="門市、期間、策略、現況"
        pageSize={list.pageSize}
        onPageSizeChange={list.setPageSize}
        page={list.page}
        onPageChange={list.setPage}
        pages={list.pages}
        filteredCount={list.filteredCount}
        totalCount={list.totalCount}
      />
      {list.filteredCount === 0 ? (
        <p className="text-sm text-zinc-500">沒有符合的紀錄。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left dark:border-zinc-700">
                <th className="py-2 pr-3 font-medium">門市</th>
                <th className="py-2 pr-3 font-medium">期間</th>
                <th className="py-2 pr-3 font-medium">月齡</th>
                <th className="py-2 pr-3 font-medium">策略</th>
                <th className="py-2 pr-3 font-medium">現況</th>
                <th className="py-2 pr-3 font-medium">檔案數</th>
                <th className="py-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.pageItems.map((group) => (
                <tr
                  key={`${group.storeCode}-${group.periodKey}`}
                  className="border-b border-zinc-100 dark:border-zinc-800"
                >
                  <td className="py-2 pr-3">{group.storeName}</td>
                  <td className="py-2 pr-3">{group.periodKey}</td>
                  <td className="py-2 pr-3">{group.ageMonths}</td>
                  <td className="py-2 pr-3">{group.policyLabel}</td>
                  <td className="py-2 pr-3">{group.stateLabel}</td>
                  <td className="py-2 pr-3">{group.fileCount}</td>
                  <td className="py-2">
                    <GroupActions group={group} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GroupActions({ group }: { group: RawRetentionGroupView }) {
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveRawPeriodAction,
    initial
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {group.canDownload ? (
        <a
          href={`/api/storage/raw-archive?storeCode=${encodeURIComponent(group.storeCode)}&periodKey=${encodeURIComponent(group.periodKey)}`}
          className="rounded border border-zinc-300 px-3 py-1 text-sm underline-offset-2 hover:underline dark:border-zinc-600"
        >
          下載 tar.gz
        </a>
      ) : null}
      {group.canArchiveNow ? (
        <form action={archiveAction} className="inline">
          <input type="hidden" name="storeCode" value={group.storeCode} />
          <input type="hidden" name="periodKey" value={group.periodKey} />
          <button
            type="submit"
            disabled={archivePending}
            className="rounded border border-zinc-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-zinc-600"
          >
            {archivePending ? "壓縮中…" : "立即壓縮"}
          </button>
        </form>
      ) : null}
      {archiveState.message ? (
        <span
          role="status"
          className={
            archiveState.ok
              ? "text-xs text-emerald-700"
              : "text-xs text-red-700"
          }
        >
          {archiveState.message}
        </span>
      ) : null}
    </div>
  );
}

export function StorageRetentionPanel({
  groups,
  minioConfigured,
}: {
  groups: RawRetentionGroupView[];
  minioConfigured: boolean;
}) {
  const [state, action, pending] = useActionState(
    runStorageRetentionAction,
    initial
  );

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded border border-zinc-200 p-4 dark:border-zinc-700">
        <h2 className="text-base font-medium">執行保留策略</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          依 ADR-0083 掃描 MinIO raw：超過 3 個月壓成 tar.gz，超過 12
          個月刪除存檔。audit 與 DB 不受影響。
        </p>
        {!minioConfigured ? (
          <p
            role="alert"
            className="text-sm text-amber-800 dark:text-amber-200"
          >
            MinIO 未設定，無法執行壓縮或下載。
          </p>
        ) : null}
        <form action={action}>
          <button
            type="submit"
            disabled={pending || !minioConfigured}
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? "執行中…" : "立即執行保留策略"}
          </button>
        </form>
        <p className="text-xs text-zinc-500">
          外部排程：
          <code className="text-xs">GET /api/cron/storage-retention</code>
          （Bearer CRON_SECRET）
        </p>
        {state.message ? (
          <p
            role="status"
            className={
              state.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"
            }
          >
            {state.message}
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-medium">raw 匯入存檔</h2>
        {groups.length === 0 ? (
          <p className="text-sm text-zinc-500">尚無 ImportRun 原始檔紀錄。</p>
        ) : (
          <RawRetentionGroupTable groups={groups} />
        )}
      </section>
    </div>
  );
}
