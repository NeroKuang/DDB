import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StaffCreateForm, StaffSummaryTable } from "@/components/staff-panels";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { listStaffForStore } from "@/staff/manage";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

export default async function StaffListPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "PERSONAL") {
    redirect("/performance");
  }

  const store = await prisma.store.findUnique({
    where: { code: ZHONGSHAN_STORE_CODE },
  });
  if (!store) {
    return (
      <p role="alert" className="text-sm text-red-700">
        找不到中山門市主檔。
      </p>
    );
  }

  const staff = await listStaffForStore(store.id);
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="店員主檔"
        description={`門市：${store.name}。維護本名、暱稱、別名、聯絡電話與薪資欄位；一般店員可開 personal 帳號。`}
      />
      {isAdmin ? <StaffCreateForm storeId={store.id} /> : null}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">店員列表</h2>
        <StaffSummaryTable staff={staff} isAdmin={isAdmin} />
      </section>
    </div>
  );
}
