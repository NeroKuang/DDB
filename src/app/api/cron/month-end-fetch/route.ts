import { NextResponse } from "next/server";
import { runMonthEndFetchCron } from "@/cron/month-end-fetch";
import { runWebFetchJob } from "@/web-fetch/manage";

export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || auth !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runMonthEndFetchCron();
  if (result.started && result.periodId) {
    await runWebFetchJob(result.periodId);
  }
  return NextResponse.json(result);
}
