import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StaffTitlesPanel } from "@/components/staff-titles-panel";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { listStaffTitles } from "@/staff-titles/manage";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

export default async function StaffTitlesPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "PERSONAL") {
    redirect("/");
  }

  const store = await prisma.store.findUnique({
    where: { code: ZHONGSHAN_STORE_CODE },
  });
  if (!store) {
    return <p>門市尚未初始化。</p>;
  }

  const titles = await listStaffTitles(store.id);
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PageHeader
        title="職稱標籤"
        description="僅供篩選與對表，不驅動薪資公式。"
      />
      <StaffTitlesPanel storeId={store.id} titles={titles} isAdmin={isAdmin} />
    </div>
  );
}
