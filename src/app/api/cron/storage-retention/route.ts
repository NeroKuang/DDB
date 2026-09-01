import { NextResponse } from "next/server";
import { runStorageRetentionCron } from "@/storage-retention/run-retention";

export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || auth !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runStorageRetentionCron();
  return NextResponse.json(result);
}
