import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";
import { getWebFetchProgress } from "@/web-fetch/manage";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
  if (session.user.role === "PERSONAL") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const storeId = url.searchParams.get("storeId")?.trim() ?? "";
  const periodKey = url.searchParams.get("periodKey")?.trim() ?? "";
  if (!storeId || !periodKey) {
    return NextResponse.json(
      { error: "missing storeId or periodKey" },
      { status: 400 }
    );
  }

  const progress = await getWebFetchProgress(storeId, periodKey);
  return NextResponse.json({
    periodKey: progress.periodKey,
    status: progress.status,
    startedAt: progress.startedAt?.toISOString() ?? null,
    finishedAt: progress.finishedAt?.toISOString() ?? null,
    errorMessage: progress.errorMessage,
    rangeStart: progress.rangeStart,
    rangeEnd: progress.rangeEnd,
  });
}
