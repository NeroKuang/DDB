import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  AdHocTaskAdminPanel,
  AdHocTaskReadOnlyList,
} from "@/components/ad-hoc-task-panels";
import { listAdHocTasksForPeriod } from "@/ad-hoc-tasks/manage";
import { loadStaffOriginalHoursForPeriod } from "@/ad-hoc-tasks/staff-original-hours";
import { PageHeader } from "@/components/page-header";
import { authOptions } from "@/lib/auth-options";
import { periodKeyDisplayLabel } from "@/lib/pay-period-calendar";
import { resolvePeriodKey } from "@/lib/resolve-period-key";
import { prisma } from "@/lib/prisma";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

type PageProps = {
  searchParams: Promise<{ period?: string }>;
};

export default async function AdHocTasksPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "PERSONAL") {
    redirect("/performance");
  }

  const params = await searchParams;
  const store = await prisma.store.findUnique({
    where: { code: ZHONGSHAN_STORE_CODE },
    include: {
      staff: {
        orderBy: { primaryNickname: "asc" },
      },
    },
  });
  if (!store) {
    return (
      <p role="alert" className="text-sm text-red-700">
        找不到中山門市主檔。
      </p>
    );
  }

  const periodKey = await resolvePeriodKey({
    searchParam: params.period,
    storeId: store.id,
  });
  const tasks = await listAdHocTasksForPeriod(store.id, periodKey);
  const staffOriginalHours = await loadStaffOriginalHoursForPeriod(periodKey);
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="追加任務"
        description={`門市：${store.name}（${periodKeyDisplayLabel(periodKey)}）。用名稱描述老闆本期其他需求；填儲存值並確認派發後才計入任務獎金。模板任務仍依點選自動計算。客座也可指定。`}
      />
      {isAdmin ? (
        <AdHocTaskAdminPanel
          storeId={store.id}
          periodKey={periodKey}
          periodLabel={periodKey}
          staffOptions={store.staff.map((person) => ({
            id: person.id,
            primaryNickname: person.primaryNickname,
            legalName:
              person.kind === "GUEST"
                ? `${person.legalName || "客座"}・客座`
                : person.legalName,
          }))}
          staffOriginalHours={staffOriginalHours}
          tasks={tasks}
        />
      ) : (
        <AdHocTaskReadOnlyList tasks={tasks} />
      )}
    </div>
  );
}
