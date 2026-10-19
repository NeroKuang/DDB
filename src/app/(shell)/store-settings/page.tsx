import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StoreSettingsPanel } from "@/components/store-settings-panel";
import { authOptions } from "@/lib/auth-options";
import { resolvePeriodKey } from "@/lib/resolve-period-key";
import { prisma } from "@/lib/prisma";
import {
  loadPeriodBusinessDayBounds,
  loadStoreSettings,
} from "@/store-settings/manage";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

type PageProps = {
  searchParams: Promise<{ period?: string }>;
};

export default async function StoreSettingsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role === "PERSONAL") {
    redirect("/");
  }

  const store = await prisma.store.findUnique({
    where: { code: ZHONGSHAN_STORE_CODE },
  });
  if (!store) {
    return <p>門市尚未初始化。</p>;
  }

  const params = await searchParams;
  const periodKey = await resolvePeriodKey({
    searchParam: params.period,
    storeId: store.id,
  });
  const settings = await loadStoreSettings(store.id);
  if (!settings) {
    return <p>無法載入門市設定。</p>;
  }
  const periodBounds = await loadPeriodBusinessDayBounds(store.id, periodKey);
  const isAdmin = session.user.role === "ADMIN";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="門市設定"
        description="單點金額、加總歸屬、自訂薪資項目、本期營業日起訖。變更會使未鎖定薪資期間的編成快取失效。"
      />
      <StoreSettingsPanel
        settings={settings}
        periodKey={periodKey}
        periodBounds={periodBounds}
        isAdmin={isAdmin}
      />
    </div>
  );
}
