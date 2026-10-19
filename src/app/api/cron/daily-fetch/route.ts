import { NextResponse } from "next/server";
import { runDailyFetchCron } from "@/cron/daily-fetch";
import { logServerError } from "@/lib/log-server-error";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || auth !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runDailyFetchCron();
    return NextResponse.json(result);
  } catch (error) {
    logServerError("cron/daily-fetch", error);
    return NextResponse.json({ error: "daily-fetch failed" }, { status: 500 });
  }
}
