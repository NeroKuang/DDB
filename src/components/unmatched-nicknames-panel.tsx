"use client";

import { useActionState } from "react";
import { ActionStatus } from "@/components/action-status";
import {
  isAutoSkippedUnmatched,
  type UnmatchedNicknameRow,
} from "@/compile/unmatched-nicknames";
import {
  attributeUnmatchedNicknameAction,
  createGuestFromUnmatchedAction,
  skipUnmatchedNicknameAction,
  undoUnmatchedResolutionAction,
  unskipUnmatchedNicknameAction,
  type UnmatchedNicknameActionState,
} from "@/pay-period/unmatched-nickname-actions";
import type { UnmatchedNicknameResolutionKind } from "@prisma/client";

const initial: UnmatchedNicknameActionState = { ok: false, message: "" };

export type UnmatchedResolutionDisplay = {
  nickname: string;
  kind: UnmatchedNicknameResolutionKind;
  targetPrimaryNickname: string | null;
};

function resolutionLabel(row: UnmatchedResolutionDisplay): string {
  if (row.kind === "ATTRIBUTE_PERIOD") {
    return `本期認列 → ${row.targetPrimaryNickname ?? "—"}`;
  }
  return `本期客座建檔 → ${row.targetPrimaryNickname ?? "—"}`;
}

export function UnmatchedNicknamesPanel({
  storeId,
  periodKey,
  unmatchedNicknames,
  adminSkippedNicknames,
  resolutions,
  staffOptions,
  locked,
  isAdmin,
}: {
  storeId: string;
  periodKey: string;
  unmatchedNicknames: UnmatchedNicknameRow[];
  adminSkippedNicknames: string[];
  resolutions: UnmatchedResolutionDisplay[];
  staffOptions: { id: string; label: string }[];
  locked: boolean;
  isAdmin: boolean;
}) {
  const [skipState, skipAction, skipPending] = useActionState(
    skipUnmatchedNicknameAction,
    initial
  );
  const [unskipState, unskipAction, unskipPending] = useActionState(
    unskipUnmatchedNicknameAction,
    initial
  );
  const [attributeState, attributeAction, attributePending] = useActionState(
    attributeUnmatchedNicknameAction,
    initial
  );
  const [guestState, guestAction, guestPending] = useActionState(
    createGuestFromUnmatchedAction,
    initial
  );
  const [undoState, undoAction, undoPending] = useActionState(
    undoUnmatchedResolutionAction,
    initial
  );

  const resolvedNicknames = new Set(resolutions.map((row) => row.nickname));
  const skippedSet = new Set(adminSkippedNicknames);
  const blocking = unmatchedNicknames.filter(
    (item) =>
      !resolvedNicknames.has(item.nickname) &&
      !isAutoSkippedUnmatched(item.amount) &&
      !skippedSet.has(item.nickname)
  );
  const adminSkipped = unmatchedNicknames.filter((item) =>
    skippedSet.has(item.nickname)
  );
  const zeroAmount = unmatchedNicknames.filter((item) =>
    isAutoSkippedUnmatched(item.amount)
  );

  if (unmatchedNicknames.length === 0 && resolutions.length === 0) {
    return null;
  }

  const statusMessage =
    skipState.message ||
    unskipState.message ||
    attributeState.message ||
    guestState.message ||
    undoState.message;
  const statusOk =
    (skipState.message && skipState.ok) ||
    (unskipState.message && unskipState.ok) ||
    (attributeState.message && attributeState.ok) ||
    (guestState.message && guestState.ok) ||
    (undoState.message && undoState.ok);

  const actionPending =
    skipPending ||
    unskipPending ||
    attributePending ||
    guestPending ||
    undoPending;

  return (
    <div className="space-y-3">
      {statusMessage ? (
        <ActionStatus ok={Boolean(statusOk)} message={statusMessage} />
      ) : null}

      {resolutions.length > 0 ? (
        <section className="card-surface space-y-2 p-4">
          <h2 className="text-base font-medium">已處理的未對上暱稱</h2>
          <p className="text-xs text-muted">
            僅本期有效；金額已計入對應店員。撤銷後請重算本期。
          </p>
          <ul className="space-y-2 text-sm">
            {resolutions.map((item) => (
              <li
                key={item.nickname}
                className="flex flex-wrap items-center gap-x-3 gap-y-1"
              >
                <span>
                  {item.nickname}：{resolutionLabel(item)}
                </span>
                {isAdmin && !locked ? (
                  <form action={undoAction} className="inline">
                    <input type="hidden" name="storeId" value={storeId} />
                    <input type="hidden" name="periodKey" value={periodKey} />
                    <input
                      type="hidden"
                      name="nickname"
                      value={item.nickname}
                    />
                    <button
                      type="submit"
                      disabled={actionPending}
                      className="text-xs underline underline-offset-2 disabled:opacity-60"
                    >
                      撤銷
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {blocking.length > 0 ? (
        <section className="alert-banner alert-warning space-y-2 p-4">
          <h2 className="text-base font-medium">未對上的暱稱（阻擋鎖定）</h2>
          <p className="text-xs opacity-80">
            來自結帳業績注記。可「認列本期」給既有店員、「本期建檔」為客座，或略過鎖定檢查。
          </p>
          <ul className="space-y-3 text-sm">
            {blocking.map((item) => (
              <li key={item.nickname} className="space-y-2">
                <div className="font-medium">
                  {item.nickname}：{item.amount.toLocaleString("zh-TW")}
                </div>
                {isAdmin && !locked ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <form
                      action={attributeAction}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <input type="hidden" name="storeId" value={storeId} />
                      <input type="hidden" name="periodKey" value={periodKey} />
                      <input
                        type="hidden"
                        name="nickname"
                        value={item.nickname}
                      />
                      <label className="flex flex-col gap-0.5 text-xs">
                        <span className="text-muted">認列本期</span>
                        <select
                          name="targetStaffId"
                          required
                          className="field-input min-w-[8rem] py-1 text-sm"
                          defaultValue=""
                        >
                          <option value="" disabled>
                            選擇店員
                          </option>
                          {staffOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="submit"
                        disabled={actionPending}
                        className="btn-secondary px-2 py-1 text-xs disabled:opacity-60"
                      >
                        認列
                      </button>
                    </form>
                    <form action={guestAction} className="inline">
                      <input type="hidden" name="storeId" value={storeId} />
                      <input type="hidden" name="periodKey" value={periodKey} />
                      <input
                        type="hidden"
                        name="nickname"
                        value={item.nickname}
                      />
                      <button
                        type="submit"
                        disabled={actionPending}
                        className="btn-secondary px-2 py-1 text-xs disabled:opacity-60"
                      >
                        本期建檔
                      </button>
                    </form>
                    <form action={skipAction} className="inline">
                      <input type="hidden" name="storeId" value={storeId} />
                      <input type="hidden" name="periodKey" value={periodKey} />
                      <input
                        type="hidden"
                        name="nickname"
                        value={item.nickname}
                      />
                      <button
                        type="submit"
                        disabled={actionPending}
                        className="btn-secondary px-2 py-1 text-xs disabled:opacity-60"
                      >
                        略過鎖定檢查
                      </button>
                    </form>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {adminSkipped.length > 0 ? (
        <section className="card-surface space-y-2 p-4">
          <h2 className="text-base font-medium">已略過的未對上暱稱</h2>
          <p className="text-xs text-muted">
            Admin 已允許略過鎖定檢查；金額仍不計入店員列。
          </p>
          <ul className="space-y-1 text-sm">
            {adminSkipped.map((item) => (
              <li
                key={item.nickname}
                className="flex flex-wrap items-center gap-x-3 gap-y-1"
              >
                <span>
                  {item.nickname}：{item.amount.toLocaleString("zh-TW")}
                </span>
                {isAdmin && !locked ? (
                  <form action={unskipAction} className="inline">
                    <input type="hidden" name="storeId" value={storeId} />
                    <input type="hidden" name="periodKey" value={periodKey} />
                    <input
                      type="hidden"
                      name="nickname"
                      value={item.nickname}
                    />
                    <button
                      type="submit"
                      disabled={actionPending}
                      className="text-xs underline underline-offset-2 disabled:opacity-60"
                    >
                      取消略過
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {zeroAmount.length > 0 ? (
        <details className="text-sm text-muted">
          <summary className="cursor-pointer">
            金額 0 的未對上暱稱（{zeroAmount.length} 筆，不阻擋鎖定）
          </summary>
          <ul className="mt-2 list-inside list-disc">
            {zeroAmount.map((item) => (
              <li key={item.nickname}>{item.nickname}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
