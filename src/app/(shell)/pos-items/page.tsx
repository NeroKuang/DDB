import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  PosItemAdminPanel,
  PosItemReadOnlyList,
} from "@/components/pos-item-panels";
import { PageHeader } from "@/components/page-header";
import { authOptions } from "@/lib/auth-options";
import { resolvePeriodKey } from "@/lib/resolve-period-key";
import { prisma } from "@/lib/prisma";
import {
  listPosItemsForStore,
  syncPosItemsFromActiveImport,
} from "@/pos-items/manage";
import { importPosItemPricesFromSources } from "@/pos-items/import-prices";
import { analyzePosItemHealth } from "@/pos-items/health";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

type PageProps = {
  searchParams: Promise<{ period?: string }>;
};

export default async function PosItemsPage({ searchParams }: PageProps) {
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

  let items = await listPosItemsForStore(store.id);
  if (items.length === 0) {
    try {
      await syncPosItemsFromActiveImport(store.id, periodKey);
      items = await listPosItemsForStore(store.id);
    } catch {
      // no import yet — show empty state
    }
  }

  const isAdmin = session?.user?.role === "ADMIN";
  if (isAdmin && items.length > 0) {
    await importPosItemPricesFromSources(store.id, periodKey);
    items = await listPosItemsForStore(store.id);
  }

  const health = analyzePosItemHealth(items);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="品項管理"
        description={`門市：${store.name}。品項名稱自 iCHEF 注記明細自動偵測；POS 售價在此維護，供業績面注記列表使用。`}
      />
      {isAdmin ? (
        <PosItemAdminPanel
          storeId={store.id}
          periodKey={periodKey}
          items={items}
          health={health}
        />
      ) : (
        <PosItemReadOnlyList items={items} health={health} />
      )}
    </div>
  );
}
