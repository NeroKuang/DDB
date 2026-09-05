import { NextResponse } from "next/server";
import { runMonthEndFetchCron } from "@/cron/month-end-fetch";
import { logServerError } from "@/lib/user-facing-error";
import { runWebFetchJob } from "@/web-fetch/manage";

export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || auth !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runMonthEndFetchCron();
    if (result.started && result.periodId) {
      await runWebFetchJob(result.periodId);
    }
    return NextResponse.json(result);
  } catch (error) {
    logServerError("cron/month-end-fetch", error);
    return NextResponse.json(
      { error: "month-end-fetch failed" },
      { status: 500 }
    );
  }
}
