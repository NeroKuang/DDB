"use client";

import { useActionState } from "react";
import {
  uploadIchefFilesAction,
  type UploadImportActionState,
} from "@/import/upload-actions";

const initial: UploadImportActionState = { ok: false, message: "" };

export function ImportUploadPanel({
  storeId,
  locked,
  isAdmin,
}: {
  storeId: string;
  locked: boolean;
  isAdmin: boolean;
}) {
  const [state, action, pending] = useActionState(
    uploadIchefFilesAction,
    initial
  );

  if (!isAdmin) {
    return null;
  }

  return (
    <section className="space-y-2 rounded border border-zinc-200 p-4 dark:border-zinc-700">
      <h2 className="text-base font-medium">上傳匯入（備援）</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        上傳與網頁取數相同的一套
        xlsx：結帳、打卡、modifier-analysis、各品項明細。全到齊才取代本期匯入。
      </p>
      {locked ? (
        <p className="text-xs text-zinc-500">本期已鎖定，請先解鎖再上傳。</p>
      ) : (
        <form action={action} className="space-y-2">
          <input type="hidden" name="storeId" value={storeId} />
          <input
            type="file"
            name="files"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            multiple
            required
            className="block w-full text-sm"
          />
          <button
            type="submit"
            disabled={pending || locked}
            className="rounded border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-zinc-600"
          >
            {pending ? "上傳中…" : "上傳並取代本期匯入"}
          </button>
        </form>
      )}
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
  );
}
