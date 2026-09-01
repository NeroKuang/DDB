import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  AdHocTaskAdminPanel,
  AdHocTaskReadOnlyList,
} from "@/components/ad-hoc-task-panels";
import {
  JULY_2026_PERIOD_KEY,
  listAdHocTasksForPeriod,
} from "@/ad-hoc-tasks/manage";
import { authOptions } from "@/lib/auth-options";
import { ensureAppBootstrap } from "@/lib/ensure-bootstrap";
import { prisma } from "@/lib/prisma";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

export default async function AdHocTasksPage() {
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
    include: {
      staff: {
        orderBy: { primaryNickname: "asc" },
      },
    },
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

  const tasks = await listAdHocTasksForPeriod(store.id, JULY_2026_PERIOD_KEY);
  const isAdmin = session.user.role === "ADMIN";

  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm text-zinc-500">
          <Link href="/" className="underline underline-offset-2">
            首頁
          </Link>
          {" · "}
          <Link href="/template-tasks" className="underline underline-offset-2">
            模板任務
          </Link>
          {" · "}
          <Link href="/performance" className="underline underline-offset-2">
            業績面
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">追加任務</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          門市：{store.name}。一期一次、不經
          POS；與模板任務一併計入任務獎金。客座也可指定（無 DDB 帳號仍可算帳）。
        </p>
      </header>
      {isAdmin ? (
        <AdHocTaskAdminPanel
          storeId={store.id}
          periodKey={JULY_2026_PERIOD_KEY}
          periodLabel="2026-07"
          staffOptions={store.staff.map((person) => ({
            id: person.id,
            primaryNickname: person.primaryNickname,
            legalName:
              person.kind === "GUEST"
                ? `${person.legalName || "客座"}・客座`
                : person.legalName,
          }))}
          tasks={tasks}
        />
      ) : (
        <AdHocTaskReadOnlyList tasks={tasks} />
      )}
    </main>
  );
}
