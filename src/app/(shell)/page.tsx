import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  DashboardOverview,
  PersonalDashboardOverview,
} from "@/components/dashboard-overview";
import { PERIOD_QUERY_PARAM } from "@/components/period-selector";
import { authOptions } from "@/lib/auth-options";
import { loadZhongshanPeriodDashboard } from "@/dashboard/load-period-dashboard";
import { resolvePeriodKey } from "@/lib/resolve-period-key";
import { prisma } from "@/lib/prisma";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

type PageProps = {
  searchParams: Promise<{ period?: string }>;
};

export default async function HomePage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const params = await searchParams;
  const store = await prisma.store.findUnique({
    where: { code: ZHONGSHAN_STORE_CODE },
    select: { id: true },
  });
  const periodKey = await resolvePeriodKey({
    searchParam: params.period,
    storeId: store?.id,
  });

  if (session.user.role === "PERSONAL") {
    return (
      <PersonalDashboardOverview
        primaryNickname={session.user.primaryNickname}
        periodKey={periodKey}
      />
    );
  }

  const isAdmin = session.user.role === "ADMIN";
  const canViewFetch =
    session.user.role === "ADMIN" || session.user.role === "SUPERVISOR";
  const status = await loadZhongshanPeriodDashboard({
    canViewFetch,
    isAdmin,
    periodKey,
  });

  if (!status) {
    return (
      <p className="text-sm text-red-700" role="alert">
        中山門市尚未初始化，請確認資料庫 seed。
      </p>
    );
  }

  return <DashboardOverview status={status} />;
}
