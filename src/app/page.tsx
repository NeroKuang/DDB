import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { seedAdminIfEmpty } from "@/auth/accounts";
import { SignOutButton } from "@/components/sign-out-button";
import { authOptions } from "@/lib/auth-options";

async function ensureSeedAdmin(): Promise<void> {
  try {
    await seedAdminIfEmpty();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/ADMIN_USERNAME and ADMIN_PASSWORD/.test(message)) {
      return;
    }
    throw error;
  }
}

export default async function Home() {
  await ensureSeedAdmin();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">DDB 業績補償</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        已登入：{session.user.username}（{session.user.role}）
      </p>
      <p className="text-sm text-zinc-500">
        匯入與薪資報表畫面尚在接上。本機 port 5003。
      </p>
      <SignOutButton />
    </main>
  );
}
