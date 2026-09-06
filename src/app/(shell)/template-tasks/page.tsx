import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  TemplateTaskAdminPanel,
  TemplateTaskReadOnlyList,
} from "@/components/template-task-panels";
import { PageHeader } from "@/components/page-header";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";
import { listTemplateTasksForStore } from "@/template-tasks/manage";
import { suggestNoteItemNames } from "@/template-tasks/suggest-item-names";

export default async function TemplateTasksPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "PERSONAL") {
    redirect("/performance");
  }

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

  const tasks = await listTemplateTasksForStore(store.id);
  const suggestions = await suggestNoteItemNames();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="模板任務"
        description={`門市：${store.name}。綁定 iCHEF 注記品項；單筆與任務達標可並行。任務達標為累加制（達門檻加發該階，多階加總，不是只領最高階）。未綁定的點選獎金為 0。`}
      />
      {isAdmin ? (
        <TemplateTaskAdminPanel
          storeId={store.id}
          tasks={tasks}
          suggestions={suggestions}
        />
      ) : (
        <TemplateTaskReadOnlyList tasks={tasks} />
      )}
    </div>
  );
}
