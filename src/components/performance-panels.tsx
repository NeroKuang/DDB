import Link from "next/link";
import type {
  MoneyPair,
  StaffPerformanceView,
} from "@/performance/analyze-staff-performance";

function formatMoney(value: number): string {
  return value.toLocaleString("zh-TW", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatWhen(at: Date): string {
  return at.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
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

export function PerformanceSummaryTable({
  rows,
}: {
  rows: StaffPerformanceView[];
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">本期沒有業績注記。</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-300">
            <th className="py-2 pr-3 font-medium">暱稱</th>
            <th className="py-2 pr-3 font-medium">本名</th>
            <th className="py-2 pr-3 font-medium">個人業績（採用／原始）</th>
            <th className="py-2 font-medium">業績獎金（採用／原始）</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.primaryNickname} className="border-b border-zinc-200">
              <td className="py-2 pr-3">
                <Link
                  href={`/performance?nickname=${encodeURIComponent(row.primaryNickname)}`}
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
  );
}

export function PerformanceDetail({ view }: { view: StaffPerformanceView }) {
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
        {view.noteList.length === 0 ? (
          <p className="text-sm text-zinc-500">本期沒有注記點選。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[24rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-300">
                  <th className="py-2 pr-3 font-medium">品項</th>
                  <th className="py-2 pr-3 font-medium">點選數</th>
                  <th className="py-2 font-medium">任務獎金（採用／原始）</th>
                </tr>
              </thead>
              <tbody>
                {view.noteList.map((row) => (
                  <tr key={row.itemName} className="border-b border-zinc-200">
                    <td className="py-2 pr-3">{row.itemName}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.clicks}</td>
                    <td className="py-2">
                      <MoneyPairCell pair={row.taskBonus} />
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
