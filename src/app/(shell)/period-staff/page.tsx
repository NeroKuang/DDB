import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { JULY_2026_PERIOD_KEY } from "@/ad-hoc-tasks/manage";
import { PageHeader } from "@/components/page-header";
import { PeriodStaffPanel } from "@/components/period-staff-panels";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import {
  getJuly2026PayPeriodState,
  isPayPeriodLocked,
} from "@/pay-period/manage";
import { listPeriodStaffForStore } from "@/pay-period-staff/manage";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

export default async function PeriodStaffPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  const store = await prisma.store.findUnique({
    where: { code: ZHONGSHAN_STORE_CODE },
  });
  if (!store) {
    return <p>門市尚未初始化。</p>;
  }

  const periodState = await getJuly2026PayPeriodState();
  const locked = isPayPeriodLocked(periodState);
  const records = await listPeriodStaffForStore(store.id, JULY_2026_PERIOD_KEY);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="本期店員設定"
        description={`2026-07 中山${locked ? "（已鎖定）" : ""}`}
      />
      <PeriodStaffPanel
        storeId={store.id}
        records={records}
        locked={locked}
        isAdmin
      />
    </div>
  );
}
