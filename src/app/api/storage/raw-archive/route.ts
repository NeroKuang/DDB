import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";
import { downloadRawArchive } from "@/storage-retention/run-retention";

export async function GET(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const storeCode = url.searchParams.get("storeCode")?.trim() ?? "";
  const periodKey = url.searchParams.get("periodKey")?.trim() ?? "";
  if (!storeCode || !periodKey) {
    return NextResponse.json(
      { error: "missing storeCode or periodKey" },
      {
        status: 400,
      }
    );
  }

  try {
    const file = await downloadRawArchive({ storeCode, periodKey });
    return new NextResponse(new Uint8Array(file.bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "download failed";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
