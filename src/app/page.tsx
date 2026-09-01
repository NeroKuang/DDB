import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { authOptions } from "@/lib/auth-options";
import { ensureAppBootstrap } from "@/lib/ensure-bootstrap";

export default async function Home() {
  await ensureAppBootstrap();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const performanceHref =
    session.user.role === "PERSONAL" && session.user.primaryNickname
      ? `/performance?nickname=${encodeURIComponent(session.user.primaryNickname)}`
      : "/performance";

  const canManageTasks =
    session.user.role === "ADMIN" || session.user.role === "SUPERVISOR";

  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">DDB 業績補償</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        已登入：{session.user.username}（{session.user.role}）
        {session.user.primaryNickname
          ? `／${session.user.primaryNickname}`
          : ""}
      </p>
      <p>
        <Link
          href={performanceHref}
          className="text-base font-medium underline underline-offset-2"
        >
          查看業績面
        </Link>
      </p>
      {canManageTasks ? (
        <>
          <p>
            <Link
              href="/accounts"
              className="text-base font-medium underline underline-offset-2"
            >
              帳號與密碼
            </Link>
          </p>
          <p>
            <Link
              href="/staff"
              className="text-base font-medium underline underline-offset-2"
            >
              {session.user.role === "ADMIN" ? "設定店員主檔" : "查看店員主檔"}
            </Link>
          </p>
          <p>
            <Link
              href="/staff-titles"
              className="text-base font-medium underline underline-offset-2"
            >
              {session.user.role === "ADMIN" ? "設定職稱標籤" : "查看職稱標籤"}
            </Link>
          </p>
          <p>
            <Link
              href="/period-staff"
              className="text-base font-medium underline underline-offset-2"
            >
              設定本期店員
            </Link>
          </p>
          <p>
            <Link
              href="/payroll"
              className="text-base font-medium underline underline-offset-2"
            >
              查看薪資報表
            </Link>
          </p>
          <p>
            <Link
              href="/template-tasks"
              className="text-base font-medium underline underline-offset-2"
            >
              {session.user.role === "ADMIN" ? "設定模板任務" : "查看模板任務"}
            </Link>
          </p>
          <p>
            <Link
              href="/ad-hoc-tasks"
              className="text-base font-medium underline underline-offset-2"
            >
              {session.user.role === "ADMIN" ? "設定追加任務" : "查看追加任務"}
            </Link>
          </p>
        </>
      ) : null}
      <p className="text-sm text-zinc-500">本機 port 5003。</p>
      <SignOutButton />
    </main>
  );
}
