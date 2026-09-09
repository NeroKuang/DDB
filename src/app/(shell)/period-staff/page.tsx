import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PeriodStaffPanel } from "@/components/period-staff-panels";
import { RecountPayPeriodPanel } from "@/components/recount-pay-period-panel";
import { UiHint } from "@/components/ui-hint";
import { authOptions } from "@/lib/auth-options";
import { periodKeyDisplayLabel } from "@/lib/pay-period-calendar";
import { resolvePeriodKey } from "@/lib/resolve-period-key";
import { prisma } from "@/lib/prisma";
import { getPayPeriodState, isPayPeriodLocked } from "@/pay-period/manage";
import { listPeriodStaffForStore } from "@/pay-period-staff/manage";
import {
  flattenStoredOverrides,
  listPayRowStored,
} from "@/pay-row-stored/manage";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

type PageProps = {
  searchParams: Promise<{ period?: string }>;
};

export default async function PeriodStaffPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  const params = await searchParams;
  const store = await prisma.store.findUnique({
    where: { code: ZHONGSHAN_STORE_CODE },
  });
  if (!store) {
    return <p>門市尚未初始化。</p>;
  }

  const periodKey = await resolvePeriodKey({
    searchParam: params.period,
    storeId: store.id,
  });
  const periodState = await getPayPeriodState(store.id, periodKey);
  const locked = isPayPeriodLocked(periodState);
  const records = await listPeriodStaffForStore(store.id, periodKey);
  const overrides = flattenStoredOverrides(
    await listPayRowStored(store.id, periodKey)
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="本期店員設定"
        description={`${periodKeyDisplayLabel(periodKey)} 中山${locked ? "（已鎖定）" : ""}`}
      />
      <UiHint>
        點「設定」開啟 popout
        編輯場別／時數／手填。店員主檔改了時薪／月薪／成數後，請按「重算當月薪資」，再到薪資報表確認原始數字。
      </UiHint>
      <RecountPayPeriodPanel
        storeId={store.id}
        periodKey={periodKey}
        locked={locked}
        isAdmin
        overrides={overrides}
        variant="button"
        label="重算當月薪資"
        hint="依目前店員主檔與本期設定重算原始數字。若有手改儲存值，會先讓你選擇要保留哪些。"
      />
      <PeriodStaffPanel
        storeId={store.id}
        periodKey={periodKey}
        records={records}
        locked={locked}
        isAdmin
      />
    </div>
  );
}
