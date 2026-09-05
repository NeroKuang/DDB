import { compilePayPeriod } from "@/compile/compile-pay-period";
import { zhongshanJuly2026Shop } from "@/compile/zhongshan-july-2026-shop";
import type { CompilePayPeriodInput } from "@/compile/compile-pay-period";
import type { FetchedIchefFiles } from "@/fetch/ichef-web-fetch";
import { parseCheckoutRows } from "@/import/parse-checkout";
import {
  parseNoteDrilldownRows,
  resolveNoteOuterItems,
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
  const drilldownNames = fetched.noteDrilldowns.map((item) => item.itemName);
  const { items: outer, complete: noteOuterComplete } =
    await resolveNoteOuterItems({
      domScrape: fetched.noteOuterItems,
      noteOuterBytes: fetched.noteOuter.bytes,
      noteOuterLabel: fetched.noteOuter.filename,
      drilldownItemNames: drilldownNames,
    });
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
  return {
    shop: zhongshanJuly2026Shop(),
    checkoutLines,
    punchPairs: punches.pairs,
    noteClicks,
    noteOuterComplete,
  };
}

export async function compileFetchedPayPeriod(
  fetched: FetchedIchefFiles,
  period: { start: Date; end: Date }
) {
  return compilePayPeriod(await compileInputFromFetchedFiles(fetched, period));
}
