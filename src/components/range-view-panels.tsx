"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import type { RangeViewResult } from "@/range/aggregate-business-day-range";
import {
  startRangeBackfillAction,
  type RangeBackfillState,
} from "@/range/actions";

const money = new Intl.NumberFormat("zh-TW", {
  maximumFractionDigits: 0,
});

function coverageLabel(status: string): string {
  switch (status) {
    case "ready":
      return "已就緒";
    case "running":
      return "取數中";
    case "failed":
      return "失敗";
    default:
      return "缺資料";
  }
}

export function RangeDisclaimerBanner() {
  return (
    <div
      role="status"
      className="alert-banner border border-[var(--accent)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--fg)]"
    >
      <p className="font-medium text-[var(--accent)]">
        區間檢視（原始數字，非發薪依據／不列入月結）
      </p>
      <p className="mt-1 text-muted">
        此頁依營業日（中午 12:00
        切開）彙總消費與時數預估，不會寫入薪資報表、不影響鎖定與應領。完整發薪請使用「薪資報表」。
      </p>
    </div>
  );
}

export function RangeDateForm({
  startBusinessDate,
  endBusinessDate,
}: {
  startBusinessDate: string;
  endBusinessDate: string;
}) {
  const router = useRouter();
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const start = String(data.get("start") ?? "");
        const end = String(data.get("end") ?? "");
        const params = new URLSearchParams();
        if (start) params.set("start", start);
        if (end) params.set("end", end);
        router.push(`/range?${params.toString()}`);
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">起營業日</span>
        <input
          type="date"
          name="start"
          required
          defaultValue={startBusinessDate}
          className="field-input"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">迄營業日</span>
        <input
          type="date"
          name="end"
          required
          defaultValue={endBusinessDate}
          className="field-input"
        />
      </label>
      <button type="submit" className="btn-secondary">
        套用區間
      </button>
      <p className="basis-full text-xs text-muted">
        營業日 10/10 = 10/10 12:00 至 10/11 12:00（Asia/Taipei）；一次最多 31
        日。
      </p>
    </form>
  );
}

export function RangeBackfillForm({
  startBusinessDate,
  endBusinessDate,
  isAdmin,
}: {
  startBusinessDate: string;
  endBusinessDate: string;
  isAdmin: boolean;
}) {
  const initial: RangeBackfillState = {
    ok: true,
    message: "",
    queued: [],
  };
  const [state, action, pending] = useActionState(
    startRangeBackfillAction,
    initial
  );

  if (!isAdmin) {
    return null;
  }

  return (
    <form action={action} className="card-surface flex flex-col gap-2 p-3">
      <input type="hidden" name="startBusinessDate" value={startBusinessDate} />
      <input type="hidden" name="endBusinessDate" value={endBusinessDate} />
      <p className="text-sm text-muted">
        補取僅拉結帳與打卡，不拉注記分析；不取代月結匯入。
      </p>
      <button type="submit" className="btn-primary w-fit" disabled={pending}>
        {pending ? "補取中…" : "補取此區間缺日"}
      </button>
      {state.message ? (
        <p
          role="status"
          className={`text-sm ${state.ok ? "text-muted" : "text-[var(--danger)]"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function RangeCoverageBar({ result }: { result: RangeViewResult }) {
  const failures = result.coverage.filter(
    (day) => day.status === "failed" && day.errorMessage
  );
  return (
    <div className="card-surface p-3">
      <p className="mb-2 text-sm font-medium">資料覆蓋</p>
      <ul className="flex flex-wrap gap-2 text-xs">
        {result.coverage.map((day) => (
          <li
            key={day.businessDate}
            className="rounded-sm border border-[var(--border)] px-2 py-1"
            title={day.errorMessage ?? undefined}
          >
            <span className="tabular-nums">{day.businessDate.slice(5)}</span>{" "}
            <span
              className={
                day.status === "failed" ? "text-[var(--danger)]" : "text-muted"
              }
            >
              {coverageLabel(day.status)}
            </span>
          </li>
        ))}
      </ul>
      {failures.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-[var(--danger)]">
          {failures.map((day) => (
            <li key={`err-${day.businessDate}`}>
              {day.businessDate}：{day.errorMessage}
            </li>
          ))}
        </ul>
      ) : null}
      {!result.complete ? (
        <p className="mt-2 text-xs text-[var(--danger)]">
          區間未完整：時數與底薪預估暫不顯示半截數字；業績仍加總已就緒之日。可按「補取此區間缺日」重試失敗／缺資料日。
        </p>
      ) : null}
    </div>
  );
}

export function RangeStaffTable({
  result,
  showHours,
}: {
  result: RangeViewResult;
  showHours: boolean;
}) {
  if (result.rows.length === 0) {
    return <p className="text-sm text-muted">此區間尚無已對上的結帳資料。</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-muted">
            <th className="px-2 py-2 font-medium">暱稱</th>
            <th className="px-2 py-2 font-medium">個人業績</th>
            <th className="px-2 py-2 font-medium">業績獎金預估</th>
            {showHours ? (
              <>
                <th className="px-2 py-2 font-medium">時數</th>
                <th className="px-2 py-2 font-medium">時薪底薪預估</th>
              </>
            ) : null}
            <th className="px-2 py-2 font-medium">筆數</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row) => (
            <tr
              key={row.primaryNickname}
              className="border-b border-[var(--border)]"
            >
              <td className="px-2 py-2">
                <div>{row.primaryNickname}</div>
                <div className="text-xs text-muted">{row.legalName}</div>
              </td>
              <td className="px-2 py-2 tabular-nums">
                {money.format(row.sales)}
              </td>
              <td className="px-2 py-2 tabular-nums">
                {money.format(row.commissionEstimate)}
              </td>
              {showHours ? (
                <>
                  <td className="px-2 py-2 tabular-nums">
                    {row.hours === null ? "—" : row.hours.toFixed(1)}
                  </td>
                  <td className="px-2 py-2 tabular-nums">
                    {row.hourlyBasePayEstimate !== null
                      ? money.format(row.hourlyBasePayEstimate)
                      : row.hours !== null
                        ? "月薪制"
                        : "—"}
                  </td>
                </>
              ) : null}
              <td className="px-2 py-2 tabular-nums">{row.lineCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RangeUnmatchedList({ result }: { result: RangeViewResult }) {
  if (result.unmatchedNicknames.length === 0) {
    return null;
  }
  return (
    <div className="card-surface p-3">
      <p className="mb-2 text-sm font-medium">區間內未對上暱稱（不影響月結）</p>
      <ul className="space-y-1 text-sm">
        {result.unmatchedNicknames.map((row) => (
          <li key={row.nickname} className="flex justify-between gap-4">
            <span>{row.nickname}</span>
            <span className="tabular-nums">{money.format(row.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
