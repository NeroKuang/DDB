import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  DashboardOverview,
  PersonalDashboardOverview,
} from "@/components/dashboard-overview";
import { authOptions } from "@/lib/auth-options";
import { loadZhongshanPeriodDashboard } from "@/dashboard/load-period-dashboard";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role === "PERSONAL") {
    return (
      <PersonalDashboardOverview
        primaryNickname={session.user.primaryNickname}
      />
    );
  }

  const isAdmin = session.user.role === "ADMIN";
  const canViewFetch =
    session.user.role === "ADMIN" || session.user.role === "SUPERVISOR";
  const status = await loadZhongshanPeriodDashboard({
    canViewFetch,
    isAdmin,
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
