import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  PerformanceDetail,
  PerformanceSummaryTable,
} from "@/components/performance-panels";
import { authOptions } from "@/lib/auth-options";
import { ensureAppBootstrap } from "@/lib/ensure-bootstrap";
import {
  analyzeAllStaffPerformance,
  analyzeStaffPerformance,
  resolveStaffByNickname,
} from "@/performance/analyze-staff-performance";
import { loadJuly2026PerformanceInput } from "@/performance/load-july-performance";

type PageProps = {
  searchParams: Promise<{ nickname?: string }>;
};

export default async function PerformancePage({ searchParams }: PageProps) {
  await ensureAppBootstrap();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;
  const input = await loadJuly2026PerformanceInput();
  const role = session.user.role;
  const isPersonal = role === "PERSONAL";

  let nickname = params.nickname?.trim() || "";
  if (isPersonal) {
    if (!session.user.primaryNickname) {
      return (
        <main className="mx-auto flex min-h-full max-w-3xl flex-col gap-4 px-4 py-10 sm:px-6">
          <h1 className="text-2xl font-semibold">業績面</h1>
          <p role="alert" className="text-sm text-red-700">
            此 personal 帳號尚未綁定店員，請聯絡 Admin。
          </p>
          <Link href="/" className="text-sm underline">
            回首頁
          </Link>
        </main>
      );
    }
    nickname = session.user.primaryNickname;
  }

  if (!nickname) {
    const rows = analyzeAllStaffPerformance({
      allStaff: input.staff,
      checkoutLines: input.checkoutLines,
      noteClicks: input.noteClicks,
      templateTasks: input.templateTasks,
    });
    return (
      <main className="mx-auto flex min-h-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
        <header className="space-y-2">
          <p className="text-sm text-zinc-500">
            <Link href="/" className="underline underline-offset-2">
              首頁
            </Link>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">業績面</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            期間：{input.periodLabel}。依 iCHEF 結帳業績注記與注記分析編成。
          </p>
        </header>
        <PerformanceSummaryTable rows={rows} />
      </main>
    );
  }

  const staff = resolveStaffByNickname(input.staff, nickname);
  if (!staff) {
    return (
      <main className="mx-auto flex min-h-full max-w-3xl flex-col gap-4 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold">業績面</h1>
        <p role="alert" className="text-sm text-red-700">
          找不到暱稱「{nickname}」的店員。
        </p>
        {!isPersonal ? (
          <Link href="/performance" className="text-sm underline">
            回列表
          </Link>
        ) : null}
      </main>
    );
  }

  const view = analyzeStaffPerformance({
    staff,
    checkoutLines: input.checkoutLines,
    noteClicks: input.noteClicks,
    templateTasks: input.templateTasks,
  });

  return (
    <main className="mx-auto flex min-h-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm text-zinc-500">
          <Link href="/" className="underline underline-offset-2">
            首頁
          </Link>
          {!isPersonal ? (
            <>
              {" · "}
              <Link
                href="/performance"
                className="underline underline-offset-2"
              >
                業績列表
              </Link>
            </>
          ) : null}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">業績面</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          期間：{input.periodLabel}
        </p>
      </header>
      <PerformanceDetail view={view} />
    </main>
  );
}
