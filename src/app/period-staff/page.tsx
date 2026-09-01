import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { JULY_2026_PERIOD_KEY } from "@/ad-hoc-tasks/manage";
import { PeriodStaffPanel } from "@/components/period-staff-panels";
import { authOptions } from "@/lib/auth-options";
import { ensureAppBootstrap } from "@/lib/ensure-bootstrap";
import { prisma } from "@/lib/prisma";
import {
  getJuly2026PayPeriodState,
  isPayPeriodLocked,
} from "@/pay-period/manage";
import { listPeriodStaffForStore } from "@/pay-period-staff/manage";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

export default async function PeriodStaffPage() {
  await ensureAppBootstrap();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  const store = await prisma.store.findUnique({
    where: { code: ZHONGSHAN_STORE_CODE },
  });
  if (!store) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p>門市尚未初始化。</p>
      </main>
    );
  }

  const periodState = await getJuly2026PayPeriodState();
  const locked = isPayPeriodLocked(periodState);
  const records = await listPeriodStaffForStore(store.id, JULY_2026_PERIOD_KEY);

  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm text-zinc-500">
          <Link href="/" className="underline underline-offset-2">
            首頁
          </Link>
          {" · "}
          <Link href="/payroll" className="underline underline-offset-2">
            薪資報表
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">本期店員設定</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          2026-07 中山{locked ? "（已鎖定）" : ""}
        </p>
      </header>
      <PeriodStaffPanel
        storeId={store.id}
        records={records}
        locked={locked}
        isAdmin
      />
    </main>
  );
}
