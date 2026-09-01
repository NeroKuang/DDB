import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StorageRetentionPanel } from "@/components/storage-retention-panel";
import { authOptions } from "@/lib/auth-options";
import { isMinioConfigured } from "@/import/minio-object-store";
import { listRawRetentionGroups } from "@/storage-retention/list-groups";

export default async function StorageRetentionPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  const groups = await listRawRetentionGroups();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="raw 保留策略"
        description="管理 iCHEF 原始 xlsx 的分級保留；壓縮後可在此下載 tar.gz 還原。"
      />
      <StorageRetentionPanel
        groups={groups}
        minioConfigured={isMinioConfigured()}
      />
    </div>
  );
}
