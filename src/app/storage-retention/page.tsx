import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { StorageRetentionPanel } from "@/components/storage-retention-panel";
import { authOptions } from "@/lib/auth-options";
import { ensureAppBootstrap } from "@/lib/ensure-bootstrap";
import { isMinioConfigured } from "@/import/minio-object-store";
import { listRawRetentionGroups } from "@/storage-retention/list-groups";

export default async function StorageRetentionPage() {
  await ensureAppBootstrap();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  const groups = await listRawRetentionGroups();

  return (
    <main className="mx-auto flex min-h-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <p className="text-sm text-zinc-500">
          <Link href="/" className="underline underline-offset-2">
            首頁
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">raw 保留策略</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          管理 iCHEF 原始 xlsx 的分級保留；壓縮後可在此下載 tar.gz 還原。
        </p>
      </header>
      <StorageRetentionPanel
        groups={groups}
        minioConfigured={isMinioConfigured()}
      />
    </main>
  );
}
