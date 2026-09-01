"use client";

import { useActionState } from "react";
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

function PeriodStaffForm({
  storeId,
  record,
  locked,
}: {
  storeId: string;
  record: PeriodStaffRecord;
  locked: boolean;
}) {
  const [state, action, pending] = useActionState(
    savePeriodStaffAction,
    initial
  );
  const d = periodStaffFormDefaults(record);

  return (
    <details className="rounded border border-zinc-200 p-3 dark:border-zinc-700">
      <summary className="cursor-pointer font-medium">
        {record.primaryNickname}
        {record.legalName ? `（${record.legalName}）` : ""}
        {d.addBackOfHouseRow ? " · 雙場別" : ""}
        {d.payTargetBonus ? " · 達標" : ""}
      </summary>
      {locked ? (
        <p className="mt-2 text-sm text-zinc-500">本期已鎖定，無法修改。</p>
      ) : (
        <form action={action} className="mt-3 space-y-3 text-sm">
          <input type="hidden" name="storeId" value={storeId} />
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
              <VenueSelect
                name="landMonthlyOn"
                defaultValue={d.landMonthlyOn}
              />
            </label>
            <label className="flex flex-col gap-1">
              任務獎金落在
              <VenueSelect
                name="landTaskBonusOn"
                defaultValue={d.landTaskBonusOn}
              />
            </label>
          </div>
          <fieldset className="space-y-2 rounded border border-zinc-100 p-2 dark:border-zinc-800">
            <legend className="px-1 text-xs text-zinc-500">
              場別／時數拆分
            </legend>
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
      )}
    </details>
  );
}

export function PeriodStaffPanel({
  storeId,
  records,
  locked,
  isAdmin,
}: {
  storeId: string;
  records: PeriodStaffRecord[];
  locked: boolean;
  isAdmin: boolean;
}) {
  if (!isAdmin) {
    return null;
  }
  return (
    <section className="space-y-2">
      <h2 className="text-base font-medium">本期店員設定</h2>
      <p className="text-xs text-zinc-500">
        場別／時數拆分、達標勾發、記點／加班／加給手填。儲存後請到薪資報表確認。
      </p>
      <div className="space-y-2">
        {records.map((record) => (
          <PeriodStaffForm
            key={record.staffId}
            storeId={storeId}
            record={record}
            locked={locked}
          />
        ))}
      </div>
    </section>
  );
}
