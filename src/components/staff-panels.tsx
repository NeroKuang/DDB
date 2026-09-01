"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  createStaffAction,
  openPersonalAccountAction,
  resetPersonalPasswordAction,
  type StaffActionState,
  updatePersonalUsernameAction,
  updateStaffAction,
} from "@/staff/actions";
import type { StaffRecord } from "@/staff/manage";

const initial: StaffActionState = { ok: false, message: "" };

const inputClass =
  "rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-600";

function kindLabel(kind: StaffRecord["kind"]): string {
  return kind === "guest" ? "客座" : "一般";
}

function matchesStaffSearch(person: StaffRecord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  const haystack = [
    person.primaryNickname,
    person.legalName,
    person.contactPhone,
    person.title,
    person.personalAccount?.username ?? "",
    ...person.aliases,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function StaffSummaryTable({
  staff,
  isAdmin,
}: {
  staff: StaffRecord[];
  isAdmin: boolean;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => staff.filter((person) => matchesStaffSearch(person, query)),
    [staff, query]
  );

  if (staff.length === 0) {
    return <p className="text-sm text-zinc-500">尚無店員。</p>;
  }

  return (
    <div className="space-y-3">
      <label className="flex max-w-md flex-col gap-1 text-sm">
        <span>搜尋店員</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="暱稱、本名、別名、電話、職稱、登入名"
          className={inputClass}
          aria-label="搜尋店員"
        />
      </label>
      {query.trim() ? (
        <p className="text-sm text-zinc-500">
          顯示 {filtered.length}／{staff.length} 人
        </p>
      ) : null}
      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-500">沒有符合的店員。</p>
      ) : (
        <StaffTable rows={filtered} isAdmin={isAdmin} />
      )}
    </div>
  );
}

function StaffTable({
  rows,
  isAdmin,
}: {
  rows: StaffRecord[];
  isAdmin: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-300">
            <th className="py-2 pr-3 font-medium">暱稱</th>
            <th className="py-2 pr-3 font-medium">本名</th>
            <th className="py-2 pr-3 font-medium">類型</th>
            <th className="py-2 pr-3 font-medium">聯絡電話</th>
            <th className="py-2 pr-3 font-medium">計薪</th>
            <th className="py-2 pr-3 font-medium">personal</th>
            {isAdmin ? <th className="py-2 font-medium">操作</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((person) => (
            <tr key={person.id} className="border-b border-zinc-200">
              <td className="py-2 pr-3">
                <Link
                  href={`/staff/${person.id}`}
                  className="underline underline-offset-2"
                >
                  {person.primaryNickname}
                </Link>
              </td>
              <td className="py-2 pr-3">{person.legalName || "—"}</td>
              <td className="py-2 pr-3">{kindLabel(person.kind)}</td>
              <td className="py-2 pr-3">{person.contactPhone || "—"}</td>
              <td className="py-2 pr-3">
                {person.payKind === "monthly"
                  ? `月薪 ${person.monthlyPay.toLocaleString("zh-TW")}`
                  : `時薪 ${person.hourlyRate}`}
              </td>
              <td className="py-2 pr-3">
                {person.personalAccount?.username ?? "—"}
              </td>
              {isAdmin ? (
                <td className="py-2">
                  <Link
                    href={`/staff/${person.id}`}
                    className="text-sm underline underline-offset-2"
                  >
                    編輯
                  </Link>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StaffFormFields({ person }: { person?: StaffRecord }) {
  return (
    <>
      <label className="flex flex-col gap-1 text-sm">
        <span>主暱稱</span>
        <input
          name="primaryNickname"
          required
          defaultValue={person?.primaryNickname ?? ""}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>本名</span>
        <input
          name="legalName"
          defaultValue={person?.legalName ?? ""}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>聯絡電話</span>
        <input
          name="contactPhone"
          defaultValue={person?.contactPhone ?? ""}
          className={inputClass}
          placeholder="0912345678"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>別名（逗號分隔）</span>
        <input
          name="aliases"
          defaultValue={person?.aliases.join("，") ?? ""}
          className={inputClass}
          placeholder="黒夢"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>職稱</span>
        <input
          name="title"
          defaultValue={person?.title ?? ""}
          className={inputClass}
          placeholder="店長"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>類型</span>
        <select
          name="kind"
          defaultValue={person?.kind ?? "regular"}
          className={inputClass}
        >
          <option value="regular">一般店員</option>
          <option value="guest">客座店員</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>計薪方式</span>
        <select
          name="payKind"
          defaultValue={person?.payKind ?? "hourly"}
          className={inputClass}
        >
          <option value="hourly">時薪</option>
          <option value="monthly">月薪</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>時薪</span>
        <input
          name="hourlyRate"
          type="number"
          min={0}
          step="any"
          defaultValue={person?.hourlyRate ?? 0}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>月薪</span>
        <input
          name="monthlyPay"
          type="number"
          min={0}
          step="any"
          defaultValue={person?.monthlyPay ?? 0}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>業績成數（0～1）</span>
        <input
          name="commissionRate"
          type="number"
          min={0}
          max={1}
          step="0.01"
          defaultValue={person?.commissionRate ?? 0.2}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>達標額</span>
        <input
          name="targetBonusAmount"
          type="number"
          min={0}
          step="any"
          defaultValue={person?.targetBonusAmount ?? 0}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>勞健保額</span>
        <input
          name="laborHealthInsuranceAmount"
          type="number"
          min={0}
          step="any"
          defaultValue={person?.laborHealthInsuranceAmount ?? 0}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        <span>發薪備註</span>
        <input
          name="payNote"
          defaultValue={person?.payNote ?? ""}
          className={inputClass}
        />
      </label>
    </>
  );
}

export function StaffCreateForm({ storeId }: { storeId: string }) {
  const [state, action, pending] = useActionState(createStaffAction, initial);
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">新增店員</h2>
      <form action={action} className="grid gap-3 sm:max-w-2xl sm:grid-cols-2">
        <input type="hidden" name="storeId" value={storeId} />
        <StaffFormFields />
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? "新增中…" : "新增店員"}
          </button>
        </div>
      </form>
      {state.message ? <StatusMessage state={state} /> : null}
    </section>
  );
}

export function StaffEditPanel({
  person,
  storeId,
}: {
  person: StaffRecord;
  storeId: string;
}) {
  const [saveState, saveAction, savePending] = useActionState(
    updateStaffAction,
    initial
  );
  const [openState, openAction, openPending] = useActionState(
    openPersonalAccountAction,
    initial
  );
  const [resetState, resetAction, resetPending] = useActionState(
    resetPersonalPasswordAction,
    initial
  );
  const [renameState, renameAction, renamePending] = useActionState(
    updatePersonalUsernameAction,
    initial
  );

  return (
    <div className="flex flex-col gap-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">編輯店員主檔</h2>
        <form
          action={saveAction}
          className="grid gap-3 sm:max-w-2xl sm:grid-cols-2"
        >
          <input type="hidden" name="id" value={person.id} />
          <input type="hidden" name="storeId" value={storeId} />
          <StaffFormFields person={person} />
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={savePending}
              className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {savePending ? "儲存中…" : "儲存主檔"}
            </button>
          </div>
        </form>
        {saveState.message ? <StatusMessage state={saveState} /> : null}
      </section>

      {person.kind === "regular" ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">personal 帳號</h2>
          <p className="text-sm text-zinc-500">
            開帳時登入名預設為聯絡電話（僅數字），初始密碼為電話後四碼。
          </p>
          {person.personalAccount ? (
            <div className="space-y-3">
              <p className="text-sm">
                目前登入名：<strong>{person.personalAccount.username}</strong>
              </p>
              <form
                action={renameAction}
                className="flex flex-wrap items-end gap-2"
              >
                <input type="hidden" name="staffId" value={person.id} />
                <label className="flex flex-col gap-1 text-sm">
                  <span>改登入名</span>
                  <input
                    name="username"
                    defaultValue={person.personalAccount.username}
                    className={inputClass}
                  />
                </label>
                <button
                  type="submit"
                  disabled={renamePending}
                  className="rounded border border-zinc-300 px-3 py-2 text-sm disabled:opacity-60"
                >
                  更新登入名
                </button>
              </form>
              <form action={resetAction}>
                <input type="hidden" name="staffId" value={person.id} />
                <button
                  type="submit"
                  disabled={resetPending}
                  className="text-sm underline underline-offset-2 disabled:opacity-60"
                >
                  重設密碼為電話後四碼
                </button>
              </form>
              {renameState.message ? (
                <StatusMessage state={renameState} />
              ) : null}
              {resetState.message ? <StatusMessage state={resetState} /> : null}
            </div>
          ) : (
            <form
              action={openAction}
              className="flex flex-wrap items-end gap-2"
            >
              <input type="hidden" name="staffId" value={person.id} />
              <label className="flex flex-col gap-1 text-sm">
                <span>登入名（可留空＝聯絡電話）</span>
                <input name="username" className={inputClass} />
              </label>
              <button
                type="submit"
                disabled={openPending}
                className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {openPending ? "開帳中…" : "開 personal 帳號"}
              </button>
            </form>
          )}
          {openState.message ? <StatusMessage state={openState} /> : null}
        </section>
      ) : (
        <p className="text-sm text-zinc-500">客座店員不開 personal 帳號。</p>
      )}
    </div>
  );
}

function StatusMessage({ state }: { state: StaffActionState }) {
  return (
    <p
      role="status"
      className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}
    >
      {state.message}
    </p>
  );
}
