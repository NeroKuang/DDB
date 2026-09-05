/**
 * Diagnostic: August note outer + sample drill-downs from iCHEF.
 * Does not write secrets; saves xlsx under /tmp/ddb-note-diag.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import {
  applyDotEnvFile,
  readIchefCredentialsFromEnv,
  fetchIchefBusinessReports,
} from "../src/fetch/ichef-web-fetch";
import {
  isUsableNoteOuterForPricing,
  mergeNoteOuterItems,
  noteOuterMatchesDrilldowns,
  noteOuterNamesMissingDrilldowns,
  parseNoteOuterProductSheetFromBuffer,
  parseNoteDrilldownRows,
} from "../src/import/parse-note-analysis";
import { readFirstSheetFromBuffer } from "../src/import/read-xlsx-sheet";

const OUT_DIR = "/tmp/ddb-note-diag";
const RANGE = { startDate: "2026-07-31", endDate: "2026-09-01" };

applyDotEnvFile(".env");
applyDotEnvFile(".env.local");

function looksLikeStaffName(name: string, staffNicks: Set<string>): boolean {
  if (staffNicks.has(name)) return true;
  // short CJK nicknames without product keywords
  if (
    name.length <= 4 &&
    /^[\u4e00-\u9fffA-Za-z]+$/.test(name) &&
    !/[套餐杯酒茶麵飯炸拍照]/.test(name)
  ) {
    return true;
  }
  return false;
}

async function main() {
  const creds = readIchefCredentialsFromEnv();
  if (!creds) {
    throw new Error("缺少 STORE_ID／LOGIN_ID／LOGIN_PASSWORD");
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const prisma = new PrismaClient();
  const staff = await prisma.staff.findMany({
    include: { aliases: true },
  });
  const staffNicks = new Set<string>();
  for (const s of staff) {
    staffNicks.add(s.primaryNickname);
    for (const a of s.aliases) staffNicks.add(a.nickname);
  }
  await prisma.$disconnect();

  console.log("=== 開始注記外層＋明細診斷取數 ===");
  console.log("range", RANGE.startDate, "~", RANGE.endDate);
  console.log("out", OUT_DIR);

  // Use the same production fetch path (also pulls checkout/punches — needed for full pipeline parity on note section).
  // To save time we only keep note artifacts in the report; checkout/punches still downloaded by fetchIchefBusinessReports.
  const fetched = await fetchIchefBusinessReports(creds, RANGE);

  const outerPath = path.join(OUT_DIR, fetched.noteOuter.filename);
  writeFileSync(outerPath, fetched.noteOuter.bytes);
  console.log(
    "\n外層檔",
    fetched.noteOuter.filename,
    "bytes",
    fetched.noteOuter.bytes.length,
    "→",
    outerPath
  );

  const parsedOuter = mergeNoteOuterItems(
    await parseNoteOuterProductSheetFromBuffer(
      fetched.noteOuter.bytes,
      fetched.noteOuter.filename,
      []
    )
  );
  const fromFetch = mergeNoteOuterItems(fetched.noteOuterItems ?? []);

  const staffLike = parsedOuter.filter((i) =>
    looksLikeStaffName(i.name, staffNicks)
  );
  const productLike = parsedOuter.filter(
    (i) => !looksLikeStaffName(i.name, staffNicks)
  );

  console.log("\n=== 外層解析 ===");
  console.log({
    parsedCount: parsedOuter.length,
    fetchNoteOuterItems: fromFetch.length,
    staffLikeCount: staffLike.length,
    productLikeCount: productLike.length,
  });
  console.log(
    "外層前 15 名:",
    parsedOuter
      .slice(0, 15)
      .map((i) => i.name)
      .join("、")
  );
  console.log(
    "職員樣名前 10:",
    staffLike
      .slice(0, 10)
      .map((i) => i.name)
      .join("、") || "（無）"
  );

  const drillNames = fetched.noteDrilldowns.map((d) => d.itemName);
  console.log("\n=== 明細取檔 ===");
  console.log({
    drilldownCount: fetched.noteDrilldowns.length,
    emptyFiles: fetched.noteDrilldowns.filter((d) => !d.file.bytes.length)
      .length,
  });

  for (const d of fetched.noteDrilldowns) {
    const safe = d.itemName.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
    const dest = path.join(
      OUT_DIR,
      `${safe}_${RANGE.startDate}~${RANGE.endDate}.xlsx`
    );
    writeFileSync(dest, d.file.bytes);
  }

  // Sample-parse a few drilldowns
  const sample = fetched.noteDrilldowns.slice(0, 5);
  for (const d of sample) {
    const rows = await readFirstSheetFromBuffer(d.file.bytes, d.file.filename);
    const clicks = parseNoteDrilldownRows(rows, d.itemName);
    const nickPreview = [...new Set(clicks.map((c) => c.nickname))].slice(0, 8);
    console.log(
      `  明細「${d.itemName}」 rows=${clicks.length} nicks=${nickPreview.join(",") || "（空）"} file=${d.file.filename} bytes=${d.file.bytes.length}`
    );
  }

  const matches = noteOuterMatchesDrilldowns(parsedOuter, drillNames);
  const usable = isUsableNoteOuterForPricing(parsedOuter, drillNames);
  const missing = noteOuterNamesMissingDrilldowns(parsedOuter, drillNames);
  const extraDrill = drillNames.filter(
    (n) => !parsedOuter.some((o) => o.name === n)
  );

  console.log("\n=== 外層 vs 明細對齊 ===");
  console.log({
    matches,
    usable,
    outerCount: parsedOuter.length,
    drillCount: new Set(drillNames).size,
    missingOuterWithoutDrill: missing.length,
    drillWithoutOuter: extraDrill.length,
  });
  if (missing.length) {
    console.log("缺明細（外層有）前 20:", missing.slice(0, 20).join("、"));
  }
  if (extraDrill.length) {
    console.log("明細有、外層無 前 20:", extraDrill.slice(0, 20).join("、"));
  }

  const verdict =
    staffLike.length > productLike.length
      ? "FAIL_OUTER_LOOKS_LIKE_STAFF_SUMMARY"
      : !matches
        ? "FAIL_OUTER_DRILLDOWN_SET_MISMATCH"
        : "OK_ALIGNED";

  const report = {
    range: RANGE,
    outerFilename: fetched.noteOuter.filename,
    outerBytes: fetched.noteOuter.bytes.length,
    parsedOuterCount: parsedOuter.length,
    staffLikeCount: staffLike.length,
    productLikeCount: productLike.length,
    staffLikeSample: staffLike.slice(0, 20).map((i) => i.name),
    productLikeSample: productLike.slice(0, 20).map((i) => i.name),
    drilldownCount: fetched.noteDrilldowns.length,
    matches,
    usable,
    missingCount: missing.length,
    missingSample: missing.slice(0, 30),
    extraDrillCount: extraDrill.length,
    extraDrillSample: extraDrill.slice(0, 30),
    checkoutBytes: fetched.checkout.bytes.length,
    punchesBytes: fetched.punches.bytes.length,
    verdict,
  };
  writeFileSync(
    path.join(OUT_DIR, "report.json"),
    JSON.stringify(report, null, 2)
  );
  console.log("\n=== 結論 ===", verdict);
  console.log("報告", path.join(OUT_DIR, "report.json"));
}

main().catch((error) => {
  console.error("DIAG_FAILED", error instanceof Error ? error.message : error);
  process.exit(1);
});
