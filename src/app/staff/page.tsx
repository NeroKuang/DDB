import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { StaffCreateForm, StaffSummaryTable } from "@/components/staff-panels";
import { authOptions } from "@/lib/auth-options";
import { ensureAppBootstrap } from "@/lib/ensure-bootstrap";
import { prisma } from "@/lib/prisma";
import { listStaffForStore } from "@/staff/manage";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

export default async function StaffListPage() {
  await ensureAppBootstrap();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role === "PERSONAL") {
    redirect("/performance");
  }

  const store = await prisma.store.findUnique({
    where: { code: ZHONGSHAN_STORE_CODE },
  });
  if (!store) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p role="alert" className="text-sm text-red-700">
          找不到中山門市主檔。
        </p>
      </main>
    );
  }

  const staff = await listStaffForStore(store.id);
  const isAdmin = session.user.role === "ADMIN";

  return (
    <main className="mx-auto flex min-h-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm text-zinc-500">
          <Link href="/" className="underline underline-offset-2">
            首頁
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">店員主檔</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          門市：{store.name}
          。維護本名、暱稱、別名、聯絡電話與薪資欄位；一般店員可開 personal
          帳號。
        </p>
      </header>
      {isAdmin ? <StaffCreateForm storeId={store.id} /> : null}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">店員列表</h2>
        <StaffSummaryTable staff={staff} isAdmin={isAdmin} />
      </section>
    </main>
  );
}
