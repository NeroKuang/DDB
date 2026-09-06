"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { ListToolbar } from "@/components/list-toolbar";
import { useClientList } from "@/components/use-client-list";
import {
  savePeriodStaffAction,
  type PeriodStaffActionState,
} from "@/pay-period-staff/actions";
import { periodStaffFormDefaults } from "@/pay-period-staff/form-defaults";
import type { PeriodStaffRecord } from "@/pay-period-staff/manage";

const initial: PeriodStaffActionState = { ok: false, message: "" };

function VenueSelect({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900"
    >
      <option value="frontOfHouse">外場</option>
      <option value="backOfHouse">內場</option>
    </select>
  );
}

function periodStaffSummaryBits(record: PeriodStaffRecord): string[] {
  const d = periodStaffFormDefaults(record);
  const bits: string[] = [];
  if (d.addBackOfHouseRow) {
    bits.push("雙場別");
  }
  if (d.payTargetBonus) {
    bits.push("達標");
  }
  return bits;
}

function PeriodStaffEditForm({
  storeId,
  periodKey,
  record,
  locked,
  formKey,
  onSaved,
}: {
  storeId: string;
  periodKey: string;
  record: PeriodStaffRecord;
  locked: boolean;
  formKey: string;
  onSaved?: () => void;
}) {
  const [state, action, pending] = useActionState(
    savePeriodStaffAction,
    initial
  );
  const d = periodStaffFormDefaults(record);
  const router = useRouter();
  const prevOk = useRef(false);

  useEffect(() => {
    if (state.ok && !prevOk.current) {
      prevOk.current = true;
      router.refresh();
      onSaved?.();
    }
    if (!state.ok) {
      prevOk.current = false;
    }
  }, [state.ok, router, onSaved]);

  if (locked) {
    return <p className="text-sm text-zinc-500">本期已鎖定，無法修改。</p>;
  }

  return (
    <form key={formKey} action={action} className="space-y-3 text-sm">
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="periodKey" value={periodKey} />
      <input type="hidden" name="staffId" value={record.staffId} />
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="addBackOfHouseRow"
          defaultChecked={d.addBackOfHouseRow}
        />
        加內場薪資列
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="payTargetBonus"
          defaultChecked={d.payTargetBonus}
        />
        本期發達標獎金
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          勞健保落在
          <VenueSelect
            name="landInsuranceOn"
            defaultValue={d.landInsuranceOn}
          />
        </label>
        <label className="flex flex-col gap-1">
          達標獎金落在
          <VenueSelect name="landTargetOn" defaultValue={d.landTargetOn} />
        </label>
        <label className="flex flex-col gap-1">
          月薪落在
          <VenueSelect name="landMonthlyOn" defaultValue={d.landMonthlyOn} />
        </label>
        <label className="flex flex-col gap-1">
          任務獎金落在
          <VenueSelect
            name="landTaskBonusOn"
            defaultValue={d.landTaskBonusOn}
          />
        </label>
      </div>
      {!record.laborHealthInsuranceCarryOverMonthly ? (
        <fieldset className="space-y-2 rounded border border-amber-200/60 p-2 dark:border-amber-900/40">
          <legend className="px-1 text-xs text-zinc-500">
            本期勞健保（主檔未勾每月沿用）
          </legend>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              計算方式
              <select
                name="laborHealthInsuranceMode"
                defaultValue={d.laborHealthInsuranceMode}
                className="rounded border px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
              >
                <option value="fixed">固定金額</option>
                <option value="ratio">底薪比例</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              固定額
              <input
                name="laborHealthInsuranceAmount"
                type="number"
                step="any"
                min={0}
                defaultValue={d.laborHealthInsuranceAmount}
                className="rounded border px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
              />
            </label>
            <label className="flex flex-col gap-1">
              比例（0～1）
              <input
                name="laborHealthInsuranceRatio"
                type="number"
                step="0.01"
                min={0}
                max={1}
                defaultValue={d.laborHealthInsuranceRatio}
                className="rounded border px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
              />
            </label>
          </div>
        </fieldset>
      ) : null}
      <fieldset className="space-y-2 rounded border border-zinc-100 p-2 dark:border-zinc-800">
        <legend className="px-1 text-xs text-zinc-500">場別／時數拆分</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            外場營業額
            <input
              name="venueSalesFront"
              type="number"
              step="any"
              defaultValue={d.venueSalesFront}
              className="rounded border px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1">
            內場營業額
            <input
              name="venueSalesBack"
              type="number"
              step="any"
              defaultValue={d.venueSalesBack}
              className="rounded border px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1">
            外場時數
            <input
              name="hoursFront"
              type="number"
              step="any"
              defaultValue={d.hoursFront}
              className="rounded border px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1">
            內場時數
            <input
              name="hoursBack"
              type="number"
              step="any"
              defaultValue={d.hoursBack}
              className="rounded border px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
        </div>
      </fieldset>
      <fieldset className="space-y-2 rounded border border-zinc-100 p-2 dark:border-zinc-800">
        <legend className="px-1 text-xs text-zinc-500">外場手填</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            記點
            <input
              name="frontDemerits"
              type="number"
              step="any"
              defaultValue={d.frontDemerits}
              className="rounded border px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1">
            加給
            <input
              name="frontAllowance"
              type="number"
              step="any"
              defaultValue={d.frontAllowance}
              className="rounded border px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1">
            加給備註
            <input
              name="frontAllowanceNote"
              defaultValue={d.frontAllowanceNote}
              className="rounded border px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1">
            假日加班
            <input
              name="frontOtHoliday"
              type="number"
              step="any"
              defaultValue={d.frontOtHoliday}
              className="rounded border px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1">
            平日加班
            <input
              name="frontOtWeekday"
              type="number"
              step="any"
              defaultValue={d.frontOtWeekday}
              className="rounded border px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
        </div>
      </fieldset>
      <fieldset className="space-y-2 rounded border border-zinc-100 p-2 dark:border-zinc-800">
        <legend className="px-1 text-xs text-zinc-500">內場手填</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            記點
            <input
              name="backDemerits"
              type="number"
              step="any"
              defaultValue={d.backDemerits}
              className="rounded border px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1">
            加給
            <input
              name="backAllowance"
              type="number"
              step="any"
              defaultValue={d.backAllowance}
              className="rounded border px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1">
            假日加班
            <input
              name="backOtHoliday"
              type="number"
              step="any"
              defaultValue={d.backOtHoliday}
              className="rounded border px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
          <label className="flex flex-col gap-1">
            平日加班
            <input
              name="backOtWeekday"
              type="number"
              step="any"
              defaultValue={d.backOtWeekday}
              className="rounded border px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
        </div>
      </fieldset>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-3 py-1.5 text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "儲存中…" : "儲存"}
      </button>
      {state.message ? (
        <p
          role="status"
          className={state.ok ? "text-emerald-700" : "text-red-700"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function PeriodStaffRow({
  record,
  locked,
  onOpen,
}: {
  record: PeriodStaffRecord;
  locked: boolean;
  onOpen: () => void;
}) {
  const bits = periodStaffSummaryBits(record);

  return (
    <tr className="border-b border-zinc-200 dark:border-zinc-800">
      <td className="py-2 pr-3">
        <span className="font-medium">{record.primaryNickname}</span>
        {record.legalName ? (
          <span className="text-zinc-500">（{record.legalName}）</span>
        ) : null}
      </td>
      <td className="py-2 pr-3 text-xs text-zinc-500">
        {bits.length > 0 ? bits.join(" · ") : "—"}
      </td>
      <td className="py-2 text-right">
        <button
          type="button"
          onClick={onOpen}
          className="text-sm underline underline-offset-2"
        >
          {locked ? "查看" : "設定"}
        </button>
      </td>
    </tr>
  );
}

function PeriodStaffDialog({
  storeId,
  periodKey,
  record,
  locked,
  open,
  onClose,
}: {
  storeId: string;
  periodKey: string;
  record: PeriodStaffRecord | null;
  locked: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = record
    ? `period-staff-dialog-${record.staffId}`
    : "period-staff-dialog";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && record) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open, record]);

  if (!record) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      className="payroll-dialog max-w-3xl"
      onClose={onClose}
      aria-labelledby={titleId}
    >
      <div className="space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-lg font-semibold">
              本期店員設定
            </h2>
            <p className="text-sm text-zinc-500">
              {record.primaryNickname}
              {record.legalName ? `（${record.legalName}）` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-2 py-1 text-xs"
            aria-label="關閉"
          >
            關閉
          </button>
        </header>
        <PeriodStaffEditForm
          storeId={storeId}
          periodKey={periodKey}
          record={record}
          locked={locked}
          formKey={open ? `open-${record.staffId}` : `closed-${record.staffId}`}
          onSaved={onClose}
        />
      </div>
    </dialog>
  );
}

function periodStaffHaystack(record: PeriodStaffRecord): string {
  return [record.primaryNickname, record.legalName].join(" ");
}

export function PeriodStaffPanel({
  storeId,
  periodKey,
  records,
  locked,
  isAdmin,
}: {
  storeId: string;
  periodKey: string;
  records: PeriodStaffRecord[];
  locked: boolean;
  isAdmin: boolean;
}) {
  if (!isAdmin) {
    return null;
  }

  return (
    <PeriodStaffPanelInner
      storeId={storeId}
      periodKey={periodKey}
      records={records}
      locked={locked}
    />
  );
}

function PeriodStaffPanelInner({
  storeId,
  periodKey,
  records,
  locked,
}: {
  storeId: string;
  periodKey: string;
  records: PeriodStaffRecord[];
  locked: boolean;
}) {
  const list = useClientList({
    items: records,
    getSearchHaystack: periodStaffHaystack,
  });
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const selected =
    records.find((row) => row.staffId === selectedStaffId) ?? null;

  return (
    <section className="space-y-3">
      <h2 className="text-base font-medium">本期店員設定</h2>
      <p className="text-xs text-zinc-500">
        場別／時數拆分、達標勾發、記點／加班／加給手填。儲存後請到薪資報表確認。
      </p>
      {records.length === 0 ? (
        <p className="text-sm text-zinc-500">本期沒有店員。</p>
      ) : (
        <>
          <ListToolbar
            query={list.query}
            onQueryChange={list.setQuery}
            searchLabel="搜尋店員"
            searchPlaceholder="暱稱、本名、職稱"
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
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-300 dark:border-zinc-700">
                    <th className="py-2 pr-3 font-medium">店員</th>
                    <th className="py-2 pr-3 font-medium">摘要</th>
                    <th className="py-2 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {list.pageItems.map((record) => (
                    <PeriodStaffRow
                      key={record.staffId}
                      record={record}
                      locked={locked}
                      onOpen={() => setSelectedStaffId(record.staffId)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <PeriodStaffDialog
            storeId={storeId}
            periodKey={periodKey}
            record={selected}
            locked={locked}
            open={selected !== null}
            onClose={() => setSelectedStaffId(null)}
          />
        </>
      )}
    </section>
  );
}
