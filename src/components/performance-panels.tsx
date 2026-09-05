"use client";

import Link from "next/link";
import { PERIOD_QUERY_PARAM } from "@/components/period-selector";
import { ListToolbar } from "@/components/list-toolbar";
import { useClientList } from "@/components/use-client-list";
import type {
  MoneyPair,
  StaffPerformanceView,
} from "@/performance/analyze-staff-performance";
import { formatTaipeiDateTime } from "@/lib/format-datetime";

function formatMoney(value: number): string {
  return value.toLocaleString("zh-TW", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatWhen(at: Date): string {
  return formatTaipeiDateTime(at) ?? "—";
}

function MoneyPairCell({ pair }: { pair: MoneyPair }) {
  const same = pair.original === pair.stored;
  return (
    <span className="tabular-nums">
      {same ? (
        formatMoney(pair.stored)
      ) : (
        <>
          <span className="block">{formatMoney(pair.stored)}</span>
          <span className="block text-xs text-zinc-500">
            原始 {formatMoney(pair.original)}
          </span>
        </>
      )}
    </span>
  );
}

function MoneyPairDl({ label, pair }: { label: string; pair: MoneyPair }) {
  return (
    <div>
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-lg tabular-nums">{formatMoney(pair.stored)}</dd>
      <dd className="text-xs text-zinc-500">
        原始 {formatMoney(pair.original)}
      </dd>
    </div>
  );
}

function performanceHaystack(row: StaffPerformanceView): string {
  return [row.primaryNickname, row.legalName].join(" ");
}

export function PerformanceSummaryTable({
  rows,
  periodKey,
}: {
  rows: StaffPerformanceView[];
  periodKey: string;
}) {
  const list = useClientList({
    items: rows,
    getSearchHaystack: performanceHaystack,
  });

  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">本期沒有業績注記。</p>;
  }
  return (
    <div className="space-y-3">
      <ListToolbar
        query={list.query}
        onQueryChange={list.setQuery}
        searchLabel="搜尋店員"
        searchPlaceholder="暱稱、本名"
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
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-300">
                <th className="py-2 pr-3 font-medium">暱稱</th>
                <th className="py-2 pr-3 font-medium">本名</th>
                <th className="py-2 pr-3 font-medium">
                  個人業績（採用／原始）
                </th>
                <th className="py-2 font-medium">業績獎金（採用／原始）</th>
              </tr>
            </thead>
            <tbody>
              {list.pageItems.map((row) => (
                <tr
                  key={row.primaryNickname}
                  className="border-b border-zinc-200"
                >
                  <td className="py-2 pr-3">
                    <Link
                      href={`/performance?nickname=${encodeURIComponent(row.primaryNickname)}&${PERIOD_QUERY_PARAM}=${encodeURIComponent(periodKey)}`}
                      className="underline underline-offset-2"
                    >
                      {row.primaryNickname}
                    </Link>
                  </td>
                  <td className="py-2 pr-3">{row.legalName || "—"}</td>
                  <td className="py-2 pr-3">
                    <MoneyPairCell pair={row.personalSales} />
                  </td>
                  <td className="py-2">
                    <MoneyPairCell pair={row.commission} />
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

export function PerformanceDetail({ view }: { view: StaffPerformanceView }) {
  const missingPriceRows = view.noteList.filter((row) => row.missingPrice);
  const giftRows = view.noteList.filter((row) => row.isGift);

  return (
    <div className="flex flex-col gap-8">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">個人業績</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {view.legalName || "（無本名）"}／{view.primaryNickname}
        </p>
        <p className="text-xs text-zinc-500">
          採用值為儲存值；尚未手調時與原始數字相同。
        </p>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <MoneyPairDl label="個人業績" pair={view.personalSales} />
          <MoneyPairDl label="業績獎金" pair={view.commission} />
          <MoneyPairDl label="任務獎金" pair={view.taskBonus} />
          <div>
            <dt className="text-zinc-500">業績項筆數</dt>
            <dd className="text-lg tabular-nums">{view.lineItems.length}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">業績項</h2>
        {view.lineItems.length === 0 ? (
          <p className="text-sm text-zinc-500">沒有業績注記。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-300">
                  <th className="py-2 pr-3 font-medium">時間</th>
                  <th className="py-2 pr-3 font-medium">暱稱</th>
                  <th className="py-2 pr-3 font-medium">訂購人</th>
                  <th className="py-2 font-medium">金額</th>
                </tr>
              </thead>
              <tbody>
                {view.lineItems.map((item, index) => (
                  <tr
                    key={`${item.at.toISOString()}-${index}`}
                    className="border-b border-zinc-200"
                  >
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {formatWhen(item.at)}
                    </td>
                    <td className="py-2 pr-3">{item.nicknameUsed}</td>
                    <td className="py-2 pr-3">{item.orderer || "—"}</td>
                    <td className="py-2 tabular-nums">
                      {formatMoney(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">客人分析</h2>
        <p className="text-sm text-zinc-500">
          只合計有訂購人、且業績注記歸在此人名下的金額。
        </p>
        {view.guestAnalysis.length === 0 ? (
          <p className="text-sm text-zinc-500">沒有可列出的客人。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-300">
                  <th className="py-2 pr-3 font-medium">訂購人</th>
                  <th className="py-2 pr-3 font-medium">筆數</th>
                  <th className="py-2 font-medium">金額</th>
                </tr>
              </thead>
              <tbody>
                {view.guestAnalysis.map((row) => (
                  <tr key={row.orderer} className="border-b border-zinc-200">
                    <td className="py-2 pr-3">{row.orderer}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.lineCount}</td>
                    <td className="py-2 tabular-nums">
                      {formatMoney(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">注記分析列表</h2>
        <p className="text-sm text-zinc-500">
          售價／總賣出依品項管理 POS 售價；常態抽成＝總賣出 ×
          店員業績成數（與結帳業績獎金同一比例）。
          模板任務為額外任務獎金，與售價無關。
        </p>
        {missingPriceRows.length > 0 ? (
          <div
            role="alert"
            className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
          >
            <p className="font-medium">
              {missingPriceRows.length} 個品項售價未設定（非贈送品）
            </p>
            <p className="mt-1">
              請至{" "}
              <Link href="/pos-items" className="underline underline-offset-2">
                品項管理
              </Link>{" "}
              填寫 POS 售價，或按「從匯入建議售價」一次帶入。
            </p>
          </div>
        ) : null}
        {view.noteList.length === 0 ? (
          <p className="text-sm text-zinc-500">本期沒有注記點選。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-300">
                  <th className="py-2 pr-3 font-medium">品項</th>
                  <th className="py-2 pr-3 font-medium">點選數</th>
                  <th className="py-2 pr-3 font-medium">售價</th>
                  <th className="py-2 pr-3 font-medium">總賣出</th>
                  <th className="py-2 pr-3 font-medium">常態抽成</th>
                  <th className="py-2 pr-3 font-medium">任務達標</th>
                  <th className="py-2 font-medium">額外任務獎金</th>
                </tr>
              </thead>
              <tbody>
                {view.noteList.map((row) => (
                  <tr
                    key={row.itemName}
                    className="border-b border-zinc-200 align-top"
                  >
                    <td className="max-w-[14rem] py-2 pr-3 [word-break:keep-all] leading-snug">
                      <span>{row.itemName}</span>
                      {row.isGift ? (
                        <span className="ml-1.5 inline-block whitespace-nowrap rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-800 align-middle">
                          贈送
                        </span>
                      ) : row.missingPrice ? (
                        <span className="ml-1.5 inline-block whitespace-nowrap text-xs text-amber-700 align-middle">
                          缺價
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{row.clicks}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatMoney(row.unitPrice ?? 0)}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatMoney(row.totalSold ?? 0)}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatMoney(row.baseCommission ?? 0)}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatMoney(row.targetBonus)}
                    </td>
                    <td className="py-2">
                      <MoneyPairCell pair={row.taskBonus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {giftRows.length > 0 ? (
          <p className="text-xs text-sky-700">
            含 {giftRows.length} 個 iCHEF 兌換／贈送品，售價 0
            為正常，不計入缺價警告。
          </p>
        ) : null}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">追加任務</h2>
        <p className="text-sm text-zinc-500">
          老闆本期其他需求。須確認派發後才計入任務獎金；原始金額為
          0，採用儲存值。
        </p>
        {view.adHocTasks.length === 0 ? (
          <p className="text-sm text-zinc-500">本期沒有追加任務。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-300">
                  <th className="py-2 pr-3 font-medium">名稱</th>
                  <th className="py-2 pr-3 font-medium">儲存值</th>
                  <th className="py-2 font-medium">狀態</th>
                </tr>
              </thead>
              <tbody>
                {view.adHocTasks.map((row, index) => (
                  <tr
                    key={`${row.name}-${index}`}
                    className="border-b border-zinc-200"
                  >
                    <td className="py-2 pr-3">{row.name}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatMoney(row.storedAmount)}
                    </td>
                    <td className="py-2">
                      {row.confirmed ? "已確認派發" : "待確認（不計入）"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
