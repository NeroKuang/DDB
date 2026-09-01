import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { listAccounts } from "@/auth/accounts";
import {
  AccountList,
  AdminResetPasswordForm,
  ChangeOwnPasswordForm,
  CreateSupervisorForm,
} from "@/components/account-panels";
import { authOptions } from "@/lib/auth-options";
import { ensureAppBootstrap } from "@/lib/ensure-bootstrap";

export default async function AccountsPage() {
  await ensureAppBootstrap();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }
  const isAdmin = session.user.role === "ADMIN";
  const users = isAdmin ? await listAccounts() : [];

  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm text-zinc-500">
          <Link href="/" className="underline underline-offset-2">
            首頁
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">帳號管理</h1>
      </header>
      <ChangeOwnPasswordForm />
      {isAdmin ? (
        <>
          <AccountList users={users} />
          <CreateSupervisorForm />
          <AdminResetPasswordForm />
        </>
      ) : (
        <p className="text-sm text-zinc-500">
          Supervisor 與 personal 帳號清單僅 Admin 可見。
        </p>
      )}
    </main>
  );
}
