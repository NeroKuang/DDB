import { runDailyFetchCatchUp } from "@/range/daily-fetch-manage";
import { prisma } from "@/lib/prisma";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

export type DailyFetchCronResult = {
  attempted: string[];
  skippedReason?: string;
};

/** Catch-up daily 營業日 grain fetch for Zhongshan. */
export async function runDailyFetchCron(): Promise<DailyFetchCronResult> {
  const store = await prisma.store.findUnique({
    where: { code: ZHONGSHAN_STORE_CODE },
  });
  if (!store) {
    return { attempted: [], skippedReason: "store missing" };
  }
  return runDailyFetchCatchUp({ storeId: store.id, lookbackDays: 7 });
}
