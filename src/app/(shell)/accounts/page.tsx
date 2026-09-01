import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { listAccounts } from "@/auth/accounts";
import {
  AccountList,
  AdminResetPasswordForm,
  ChangeOwnPasswordForm,
  CreateSupervisorForm,
} from "@/components/account-panels";
import { PageHeader } from "@/components/page-header";
import { authOptions } from "@/lib/auth-options";

export default async function AccountsPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";
  const users = isAdmin ? await listAccounts() : [];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title="帳號管理" />
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
    </div>
  );
}
