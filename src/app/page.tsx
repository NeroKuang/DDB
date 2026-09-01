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
      <p className="text-sm text-zinc-500">
        薪資報表編成與匯入畫面尚在接上。本機 port 5003。
      </p>
      <SignOutButton />
    </main>
  );
}
