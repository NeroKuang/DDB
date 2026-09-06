import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StaffCreateForm, StaffSummaryTable } from "@/components/staff-panels";
import { UiHint } from "@/components/ui-hint";
import { authOptions } from "@/lib/auth-options";
import { resolvePeriodKey } from "@/lib/resolve-period-key";
import { listPeriodOptions } from "@/pay-period/list-period-options";
import { prisma } from "@/lib/prisma";
import { listStaffForStore } from "@/staff/manage";
import { getStoreDefaultCommissionRate } from "@/staff/store-settings";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";
import { StoreCommissionDefaultPanel } from "@/components/store-commission-default-panel";

type PageProps = {
  searchParams: Promise<{ period?: string }>;
};

export default async function StaffListPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "PERSONAL") {
    redirect("/performance");
  }

  const params = await searchParams;
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

  const periodKey = await resolvePeriodKey({
    searchParam: params.period,
    storeId: store.id,
  });
  const periodOptions = await listPeriodOptions(store.id);
  const staff = await listStaffForStore(store.id);
  const defaultCommissionRate = await getStoreDefaultCommissionRate(store.id);
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="店員主檔"
        description={`門市：${store.name}。維護本名、暱稱、別名、聯絡電話與薪資欄位；一般店員可開 personal 帳號；客座須指定僅出現的薪資期間。`}
      />
      <UiHint>
        列表按「編輯」開 popout 快速改主檔；需要 personal 帳號時進「完整編輯」。
      </UiHint>
      {isAdmin ? (
        <StoreCommissionDefaultPanel
          storeId={store.id}
          defaultCommissionRate={defaultCommissionRate}
        />
      ) : null}
      {isAdmin ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">店員列表</h2>
            <StaffCreateForm
              storeId={store.id}
              periodOptions={periodOptions}
              defaultGuestPeriodKey={periodKey}
              defaultCommissionRate={defaultCommissionRate}
            />
          </div>
          <StaffSummaryTable
            staff={staff}
            isAdmin={isAdmin}
            storeId={store.id}
            periodOptions={periodOptions}
            defaultGuestPeriodKey={periodKey}
          />
        </section>
      ) : (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">店員列表</h2>
          <StaffSummaryTable
            staff={staff}
            isAdmin={isAdmin}
            storeId={store.id}
            periodOptions={periodOptions}
            defaultGuestPeriodKey={periodKey}
          />
        </section>
      )}
    </div>
  );
}
