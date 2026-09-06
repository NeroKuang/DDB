"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { DialogShellChrome } from "@/components/cathedral-ornament";
import { DialogCloseButton } from "@/components/dialog-close-button";
import { IconButton } from "@/components/icon-button";
import { ListToolbar } from "@/components/list-toolbar";
import { useClientList } from "@/components/use-client-list";
import { IconPencil } from "@/components/ui-icons";
import {
  createStaffAction,
  openPersonalAccountAction,
  resetPersonalPasswordAction,
  type StaffActionState,
  updatePersonalUsernameAction,
  updateStaffAction,
} from "@/staff/actions";
import type { StaffRecord } from "@/staff/manage";
import { guestPeriodDisplay } from "@/staff/guest-period";
import { DEFAULT_COMMISSION_RATE } from "@/lib/commission-rate";
import {
  mergePeriodOptions,
  type PeriodOption,
} from "@/pay-period/list-period-options";

const initial: StaffActionState = { ok: false, message: "" };

const inputClass =
  "rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-600";

function kindLabel(person: StaffRecord): string {
  if (person.kind === "guest") {
    return guestPeriodDisplay(person.guestPeriodKey);
  }
  return "一般";
}

function staffSearchHaystack(person: StaffRecord): string {
  return [
    person.primaryNickname,
    person.legalName,
    person.contactPhone,
    person.title,
    person.personalAccount?.username ?? "",
    person.guestPeriodKey ?? "",
    ...person.aliases,
  ].join(" ");
}

export function StaffSummaryTable({
  staff,
  isAdmin,
  storeId,
  periodOptions,
  defaultGuestPeriodKey,
}: {
  staff: StaffRecord[];
  isAdmin: boolean;
  storeId: string;
  periodOptions: PeriodOption[];
  defaultGuestPeriodKey?: string;
}) {
  const list = useClientList({
    items: staff,
    getSearchHaystack: staffSearchHaystack,
  });

  if (staff.length === 0) {
    return <p className="text-sm text-zinc-500">尚無店員。</p>;
  }

  return (
    <div className="space-y-3">
      <ListToolbar
        query={list.query}
        onQueryChange={list.setQuery}
        searchLabel="搜尋店員"
        searchPlaceholder="暱稱、本名、別名、電話、職稱、登入名"
        pageSize={list.pageSize}
        onPageSizeChange={list.setPageSize}
        page={list.page}
        onPageChange={list.setPage}
        pages={list.pages}
        filteredCount={list.filteredCount}
        totalCount={list.totalCount}
      />
      {list.filteredCount === 0 ? (
        <p className="text-sm text-zinc-500">沒有符合的店員。</p>
      ) : (
        <StaffTable
          rows={list.pageItems}
          isAdmin={isAdmin}
          storeId={storeId}
          periodOptions={periodOptions}
          defaultGuestPeriodKey={defaultGuestPeriodKey}
        />
      )}
    </div>
  );
}

function StaffTable({
  rows,
  isAdmin,
  storeId,
  periodOptions,
  defaultGuestPeriodKey,
}: {
  rows: StaffRecord[];
  isAdmin: boolean;
  storeId: string;
  periodOptions: PeriodOption[];
  defaultGuestPeriodKey?: string;
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
              <td className="py-2 pr-3">{kindLabel(person)}</td>
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
                  <StaffInlineEdit
                    person={person}
                    storeId={storeId}
                    periodOptions={periodOptions}
                    defaultGuestPeriodKey={defaultGuestPeriodKey}
                  />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function pickGuestPeriodKey(
  mergedOptions: PeriodOption[],
  person: StaffRecord | undefined,
  defaultGuestPeriodKey: string | undefined
): string {
  const existing = person?.guestPeriodKey?.trim();
  if (
    existing &&
    mergedOptions.some((option) => option.periodKey === existing)
  ) {
    return existing;
  }
  const fallback = defaultGuestPeriodKey?.trim();
  if (
    fallback &&
    mergedOptions.some((option) => option.periodKey === fallback)
  ) {
    return fallback;
  }
  return mergedOptions[0]?.periodKey ?? "";
}

function StaffFormFields({
  person,
  periodOptions,
  defaultGuestPeriodKey,
  defaultCommissionRate = DEFAULT_COMMISSION_RATE,
}: {
  person?: StaffRecord;
  periodOptions: PeriodOption[];
  defaultGuestPeriodKey?: string;
  defaultCommissionRate?: number;
}) {
  const mergedOptions = useMemo(
    () =>
      mergePeriodOptions(
        periodOptions,
        person?.guestPeriodKey,
        defaultGuestPeriodKey
      ),
    [periodOptions, person?.guestPeriodKey, defaultGuestPeriodKey]
  );
  const [kind, setKind] = useState<StaffRecord["kind"]>(
    person?.kind ?? "regular"
  );
  const [guestPeriodKey, setGuestPeriodKey] = useState(() =>
    pickGuestPeriodKey(mergedOptions, person, defaultGuestPeriodKey)
  );
  const [laborMode, setLaborMode] = useState<
    StaffRecord["laborHealthInsuranceMode"]
  >(person?.laborHealthInsuranceMode ?? "fixed");
  const isGuest = kind === "guest";

  useEffect(() => {
    if (kind !== "guest") {
      return;
    }
    if (
      guestPeriodKey &&
      mergedOptions.some((option) => option.periodKey === guestPeriodKey)
    ) {
      return;
    }
    const next = pickGuestPeriodKey(
      mergedOptions,
      person,
      defaultGuestPeriodKey
    );
    if (next) {
      setGuestPeriodKey(next);
    }
  }, [kind, guestPeriodKey, mergedOptions, person, defaultGuestPeriodKey]);

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
          value={kind}
          onChange={(event) =>
            setKind(event.target.value === "guest" ? "guest" : "regular")
          }
          className={inputClass}
        >
          <option value="regular">一般店員</option>
          <option value="guest">客座店員</option>
        </select>
      </label>
      {isGuest ? (
        <label className="flex flex-col gap-1 text-sm">
          <span>客座期間（僅該月薪資表）</span>
          <select
            name="guestPeriodKey"
            required
            value={guestPeriodKey}
            onChange={(event) => setGuestPeriodKey(event.target.value)}
            className={inputClass}
          >
            {mergedOptions.length === 0 ? (
              <option value="">尚無可選期間</option>
            ) : (
              mergedOptions.map((option) => (
                <option key={option.periodKey} value={option.periodKey}>
                  {option.label}客座
                </option>
              ))
            )}
          </select>
          <span className="text-xs text-zinc-500">
            客座只會出現在所選月份的薪資報表上。
          </span>
        </label>
      ) : (
        <input type="hidden" name="guestPeriodKey" value="" />
      )}
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
        <span>業績成數（預設 20%，填 0.2）</span>
        <input
          name="commissionRate"
          type="number"
          min={0}
          max={1}
          step="0.01"
          defaultValue={person?.commissionRate ?? defaultCommissionRate}
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
        <span>勞健保計算</span>
        <select
          name="laborHealthInsuranceMode"
          value={laborMode}
          onChange={(event) =>
            setLaborMode(event.target.value === "ratio" ? "ratio" : "fixed")
          }
          className={inputClass}
        >
          <option value="fixed">固定金額</option>
          <option value="ratio">底薪比例</option>
        </select>
      </label>
      {laborMode === "fixed" ? (
        <label className="flex flex-col gap-1 text-sm">
          <span>勞健保固定額</span>
          <input
            name="laborHealthInsuranceAmount"
            type="number"
            min={0}
            step="any"
            defaultValue={person?.laborHealthInsuranceAmount ?? 0}
            className={inputClass}
          />
        </label>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          <span>勞健保比例（0～1，× 該列原始底薪）</span>
          <input
            name="laborHealthInsuranceRatio"
            type="number"
            min={0}
            max={1}
            step="0.01"
            defaultValue={person?.laborHealthInsuranceRatio ?? 0}
            className={inputClass}
          />
          <input type="hidden" name="laborHealthInsuranceAmount" value="0" />
        </label>
      )}
      {laborMode === "fixed" ? (
        <input type="hidden" name="laborHealthInsuranceRatio" value="0" />
      ) : null}
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="laborHealthInsuranceCarryOverMonthly"
          defaultChecked={person?.laborHealthInsuranceCarryOverMonthly ?? true}
          value="on"
        />
        <span>每月沿用上列勞健保設定（未勾選時改在「本期店員」逐月設定）</span>
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

export function StaffCreateForm({
  storeId,
  periodOptions,
  defaultGuestPeriodKey,
  defaultCommissionRate,
}: {
  storeId: string;
  periodOptions: PeriodOption[];
  defaultGuestPeriodKey?: string;
  defaultCommissionRate?: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createStaffAction, initial);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!state.ok) {
      return;
    }
    setOpen(false);
    router.refresh();
  }, [state.ok, router]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        新增店員
      </button>
      <dialog
        ref={dialogRef}
        className="payroll-dialog max-w-3xl"
        onClose={() => setOpen(false)}
        aria-labelledby="staff-create-dialog-title"
      >
        <DialogShellChrome>
          <header className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="staff-create-dialog-title"
                className="section-title font-display"
              >
                新增店員
              </h2>
            </div>
            <DialogCloseButton onClick={() => setOpen(false)} />
          </header>
          <form
            key={open ? "open" : "closed"}
            action={action}
            className="grid gap-3 sm:grid-cols-2"
          >
            <input type="hidden" name="storeId" value={storeId} />
            <StaffFormFields
              periodOptions={periodOptions}
              defaultGuestPeriodKey={defaultGuestPeriodKey}
              defaultCommissionRate={defaultCommissionRate}
            />
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {pending ? "新增中…" : "新增店員"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-secondary px-3 py-2 text-sm"
              >
                取消
              </button>
            </div>
          </form>
          {state.message ? <StatusMessage state={state} /> : null}
        </DialogShellChrome>
      </dialog>
    </>
  );
}

export function StaffEditPanel({
  person,
  storeId,
  periodOptions,
  defaultGuestPeriodKey,
}: {
  person: StaffRecord;
  storeId: string;
  periodOptions: PeriodOption[];
  defaultGuestPeriodKey?: string;
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
        <h2 className="section-title font-display">編輯店員主檔</h2>
        <form
          action={saveAction}
          className="grid gap-3 sm:max-w-2xl sm:grid-cols-2"
        >
          <input type="hidden" name="id" value={person.id} />
          <input type="hidden" name="storeId" value={storeId} />
          <StaffFormFields
            person={person}
            periodOptions={periodOptions}
            defaultGuestPeriodKey={defaultGuestPeriodKey}
          />
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
          <h2 className="section-title font-display">personal 帳號</h2>
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

function StaffInlineEdit({
  person,
  storeId,
  periodOptions,
  defaultGuestPeriodKey,
}: {
  person: StaffRecord;
  storeId: string;
  periodOptions: PeriodOption[];
  defaultGuestPeriodKey?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateStaffAction, initial);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const periodQuery = defaultGuestPeriodKey
    ? `?period=${encodeURIComponent(defaultGuestPeriodKey)}`
    : "";
  const titleId = `staff-edit-dialog-${person.id}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!state.ok) {
      return;
    }
    setOpen(false);
    router.refresh();
  }, [state.ok, router]);

  return (
    <>
      <IconButton label="編輯" size="sm" onClick={() => setOpen(true)}>
        <IconPencil />
      </IconButton>
      <dialog
        ref={dialogRef}
        className="payroll-dialog max-w-3xl"
        onClose={() => setOpen(false)}
        aria-labelledby={titleId}
      >
        <DialogShellChrome>
          <header className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="section-title font-display">
                編輯店員主檔
              </h2>
              <p className="mt-1.5 text-sm text-muted">
                {person.primaryNickname}
                {person.legalName ? `（${person.legalName}）` : ""}
              </p>
            </div>
            <DialogCloseButton onClick={() => setOpen(false)} />
          </header>
          <form
            key={open ? `open-${person.id}` : `closed-${person.id}`}
            action={action}
            className="grid gap-3 sm:grid-cols-2"
          >
            <input type="hidden" name="id" value={person.id} />
            <input type="hidden" name="storeId" value={storeId} />
            <StaffFormFields
              person={person}
              periodOptions={periodOptions}
              defaultGuestPeriodKey={defaultGuestPeriodKey}
            />
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {pending ? "儲存中…" : "儲存"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-secondary px-3 py-1.5 text-sm"
              >
                取消
              </button>
              <Link
                href={`/staff/${person.id}${periodQuery}`}
                className="text-xs text-zinc-500 underline underline-offset-2"
              >
                完整編輯（含 personal 帳號）
              </Link>
            </div>
          </form>
          {state.message ? <StatusMessage state={state} /> : null}
        </DialogShellChrome>
      </dialog>
    </>
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
