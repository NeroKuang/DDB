import { compilePayPeriod } from "@/compile/compile-pay-period";
import { zhongshanJuly2026Shop } from "@/compile/zhongshan-july-2026-shop";
import type { CompilePayPeriodInput } from "@/compile/compile-pay-period";
import type { FetchedIchefFiles } from "@/fetch/ichef-web-fetch";
import { parseCheckoutRows } from "@/import/parse-checkout";
import {
  parseNoteDrilldownRows,
  parseNoteOuterRows,
} from "@/import/parse-note-analysis";
import { parsePunchRows } from "@/import/parse-punches";
import { readFirstSheetFromBuffer } from "@/import/read-xlsx-sheet";

export async function compileInputFromFetchedFiles(
  fetched: FetchedIchefFiles,
  period: { start: Date; end: Date }
): Promise<CompilePayPeriodInput> {
  const checkoutLines = parseCheckoutRows(
    await readFirstSheetFromBuffer(
      fetched.checkout.bytes,
      fetched.checkout.filename
    ),
    period
  );
  const punches = parsePunchRows(
    await readFirstSheetFromBuffer(
      fetched.punches.bytes,
      fetched.punches.filename
    ),
    period
  );
  const outer = parseNoteOuterRows(
    await readFirstSheetFromBuffer(
      fetched.noteOuter.bytes,
      fetched.noteOuter.filename
    )
  );
  const noteClicks = (
    await Promise.all(
      fetched.noteDrilldowns.map(async (item) =>
        parseNoteDrilldownRows(
          await readFirstSheetFromBuffer(item.file.bytes, item.file.filename),
          item.itemName
        )
      )
    )
  ).flat();
  const outerNames = new Set(outer.map((item) => item.name));
  const drilldownNames = new Set(
    fetched.noteDrilldowns.map((item) => item.itemName)
  );
  const everyOuterHasDrilldown =
    outerNames.size > 0 &&
    [...outerNames].every((name) => drilldownNames.has(name)) &&
    drilldownNames.size === outerNames.size;
  return {
    shop: zhongshanJuly2026Shop(),
    checkoutLines,
    punchPairs: punches.pairs,
    noteClicks,
    noteOuterComplete: everyOuterHasDrilldown,
  };
}

export async function compileFetchedPayPeriod(
  fetched: FetchedIchefFiles,
  period: { start: Date; end: Date }
) {
  return compilePayPeriod(await compileInputFromFetchedFiles(fetched, period));
}
