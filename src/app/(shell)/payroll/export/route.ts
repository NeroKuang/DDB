import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { compileZhongshanPayPeriod } from "@/compile/compile-for-period";
import { payRowsToNamedCsv } from "@/export/pay-report-csv";
import { authOptions } from "@/lib/auth-options";
import { ensureAppBootstrap } from "@/lib/ensure-bootstrap";
import { resolvePeriodKey } from "@/lib/resolve-period-key";
import { prisma } from "@/lib/prisma";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";

export async function GET(request: Request) {
  await ensureAppBootstrap();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
  if (session.user.role === "PERSONAL") {
    return NextResponse.json(
      { error: "personal 不可匯出發薪單" },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const store = await prisma.store.findUnique({
    where: { code: ZHONGSHAN_STORE_CODE },
    select: { id: true },
  });
  const periodKey = await resolvePeriodKey({
    searchParam: url.searchParams.get("period"),
    storeId: store?.id,
  });

  try {
    const compiled = await compileZhongshanPayPeriod(periodKey);
    const csv = payRowsToNamedCsv(compiled.result.payRows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ddb-payroll-${periodKey}.csv"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "編成薪資報表失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
