import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { seedAdminIfEmpty } from "@/auth/accounts";
import { LoginForm } from "@/components/login-form";
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

export default async function LoginPage() {
  await ensureSeedAdmin();
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">DDB 登入</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          使用自訂帳號與密碼。不公開註冊。
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-zinc-500">載入中…</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
