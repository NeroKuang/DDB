import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { seedAdminIfEmpty } from "@/auth/accounts";
import { FrameCornerTicks } from "@/components/cathedral-ornament";
import { LoginForm } from "@/components/login-form";
import { authOptions } from "@/lib/auth-options";

/** Login seeds Admin and reads session — never prerender without Postgres. */
export const dynamic = "force-dynamic";

async function ensureSeedAdmin(): Promise<void> {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }
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
    <main className="mx-auto flex min-h-full max-w-sm flex-col justify-center gap-5 px-6 py-14">
      <div className="sidebar-brand space-y-2 px-5 py-6 text-center">
        <p className="font-display text-[0.6875rem] tracking-[0.28em] text-[var(--silver)] uppercase">
          DDB
        </p>
        <h1 className="page-title">薪資與業績</h1>
        <hr className="brand-rule" />
        <p className="text-sm text-muted">
          店家算薪水、公布業績；店員登入查看自己的數字。
        </p>
      </div>
      <div className="login-panel">
        <FrameCornerTicks />
        <div className="relative z-[1]">
          <Suspense fallback={<p className="text-sm text-muted">載入中…</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
