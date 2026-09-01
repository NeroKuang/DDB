import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { payRowsToNamedCsv } from "@/export/pay-report-csv";
import { authOptions } from "@/lib/auth-options";
import { ensureAppBootstrap } from "@/lib/ensure-bootstrap";
import { compileJuly2026Payroll } from "@/payroll/compile-july-payroll";

export async function GET() {
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

  try {
    const compiled = await compileJuly2026Payroll();
    const csv = payRowsToNamedCsv(compiled.result.payRows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="ddb-payroll-2026-07.csv"',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "編成薪資報表失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
