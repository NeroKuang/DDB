import type { AccountRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { authOptions } from "@/lib/auth-options";
import { ensureAppBootstrap } from "@/lib/ensure-bootstrap";
import { resolvePeriodKey } from "@/lib/resolve-period-key";
import { listPeriodOptions } from "@/pay-period/list-period-options";
import { prisma } from "@/lib/prisma";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

/** Shell reads session／Postgres；must not prerender during `next build` (no DB in image build). */
export const dynamic = "force-dynamic";

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureAppBootstrap();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = session.user.role as AccountRole;
  const store = await prisma.store.findUnique({
    where: { code: ZHONGSHAN_STORE_CODE },
    select: { id: true },
  });
  const periodOptions = store ? await listPeriodOptions(store.id) : [];
  const currentPeriodKey = store
    ? await resolvePeriodKey({ storeId: store.id })
    : undefined;

  return (
    <AppShell
      role={role}
      username={session.user.username}
      primaryNickname={session.user.primaryNickname}
      periodOptions={periodOptions}
      currentPeriodKey={currentPeriodKey}
    >
      <main className="ui-enter mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </AppShell>
  );
}
