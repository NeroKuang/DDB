import { NextResponse } from "next/server";
import { backfillPayPeriods } from "@/cron/backfill-pay-periods";
import { isValidPeriodKey } from "@/lib/pay-period-calendar";
import { logServerError } from "@/lib/log-server-error";

export const dynamic = "force-dynamic";
/** Self-hosted Node: allow multi-hour sequential Playwright fetches. */
export const maxDuration = 14400;

export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || auth !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const from = String(url.searchParams.get("from") ?? "").trim();
  const toRaw = String(url.searchParams.get("to") ?? "").trim();
  const force = url.searchParams.get("force") === "1";
  const continueOnError = url.searchParams.get("continueOnError") === "1";

  if (!from || !isValidPeriodKey(from)) {
    return NextResponse.json(
      { error: "query from=YYYY-MM is required" },
      { status: 400 }
    );
  }
  if (toRaw && !isValidPeriodKey(toRaw)) {
    return NextResponse.json(
      { error: "query to=YYYY-MM is invalid" },
      { status: 400 }
    );
  }

  try {
    const result = await backfillPayPeriods({
      fromPeriodKey: from,
      toPeriodKey: toRaw || undefined,
      force,
      continueOnError,
    });
    const failed = result.results.some((row) => row.status === "failed");
    return NextResponse.json(result, { status: failed ? 500 : 200 });
  } catch (error) {
    logServerError("cron/backfill-pay-periods", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "backfill-pay-periods failed",
      },
      { status: 500 }
    );
  }
}
