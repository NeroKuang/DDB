import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  TemplateTaskAdminPanel,
  TemplateTaskReadOnlyList,
} from "@/components/template-task-panels";
import { authOptions } from "@/lib/auth-options";
import { ensureAppBootstrap } from "@/lib/ensure-bootstrap";
import { prisma } from "@/lib/prisma";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";
import { listTemplateTasksForStore } from "@/template-tasks/manage";
import { suggestNoteItemNames } from "@/template-tasks/suggest-item-names";

export default async function TemplateTasksPage() {
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

  const tasks = await listTemplateTasksForStore(store.id);
  const suggestions = await suggestNoteItemNames();
  const isAdmin = session.user.role === "ADMIN";

  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm text-zinc-500">
          <Link href="/" className="underline underline-offset-2">
            首頁
          </Link>
          {" · "}
          <Link href="/performance" className="underline underline-offset-2">
            業績面
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">模板任務</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          門市：{store.name}。綁定 iCHEF
          注記品項與單筆任務獎金；未綁定的點選獎金為 0，不會自動建檔。
        </p>
      </header>
      {isAdmin ? (
        <TemplateTaskAdminPanel
          storeId={store.id}
          tasks={tasks}
          suggestions={suggestions}
        />
      ) : (
        <TemplateTaskReadOnlyList tasks={tasks} />
      )}
    </main>
  );
}
