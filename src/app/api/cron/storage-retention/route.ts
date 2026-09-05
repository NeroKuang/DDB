import { NextResponse } from "next/server";
import { logServerError } from "@/lib/user-facing-error";
import { runStorageRetentionCron } from "@/storage-retention/run-retention";

export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || auth !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runStorageRetentionCron();
    return NextResponse.json(result);
  } catch (error) {
    logServerError("cron/storage-retention", error);
    return NextResponse.json(
      { error: "storage-retention failed" },
      { status: 500 }
    );
  }
}
