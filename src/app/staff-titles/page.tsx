import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { StaffTitlesPanel } from "@/components/staff-titles-panel";
import { authOptions } from "@/lib/auth-options";
import { ensureAppBootstrap } from "@/lib/ensure-bootstrap";
import { prisma } from "@/lib/prisma";
import { listStaffTitles } from "@/staff-titles/manage";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

export default async function StaffTitlesPage() {
  await ensureAppBootstrap();
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
    return <main className="p-10">門市尚未初始化。</main>;
  }

  const titles = await listStaffTitles(store.id);
  const isAdmin = session.user.role === "ADMIN";

  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col gap-6 px-4 py-10">
      <header className="space-y-2">
        <p className="text-sm text-zinc-500">
          <Link href="/" className="underline underline-offset-2">
            首頁
          </Link>
          {" · "}
          <Link href="/staff" className="underline underline-offset-2">
            店員主檔
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">職稱標籤</h1>
        <p className="text-sm text-zinc-500">
          僅供篩選與對表，不驅動薪資公式。
        </p>
      </header>
      <StaffTitlesPanel storeId={store.id} titles={titles} isAdmin={isAdmin} />
    </main>
  );
}
