import type { CheckoutNoteLine } from "@/import/parse-checkout";
import { parseCheckoutRows } from "@/import/parse-checkout";
import type { NoteAnalysisClick } from "@/import/parse-note-analysis";
import {
  itemNameFromDrilldownFilename,
  parseNoteDrilldownRows,
  parseNoteOuterRows,
} from "@/import/parse-note-analysis";
import type { PunchPair } from "@/import/parse-punches";
import { parsePunchRows } from "@/import/parse-punches";
import { readFirstSheetFromBuffer } from "@/import/read-xlsx-sheet";
import {
  classifyUploadedFiles,
  validateUploadSet,
  type UploadFileInput,
} from "@/import/upload-ichef-files";

export type ParsedUploadSet = {
  classified: ReturnType<typeof classifyUploadedFiles>;
  checkoutLines: CheckoutNoteLine[];
  punchPairs: PunchPair[];
  noteClicks: NoteAnalysisClick[];
  noteOuterComplete: boolean;
};

export async function parseUploadSet(
  files: UploadFileInput[],
  period: { start: Date; end: Date }
): Promise<ParsedUploadSet> {
  validateUploadSet(files);
  const classified = classifyUploadedFiles(files);
  if (!classified.checkout || !classified.punches || !classified.noteOuter) {
    throw new Error("上傳檔案不完整");
  }

  const checkoutLines = parseCheckoutRows(
    await readFirstSheetFromBuffer(
      classified.checkout.bytes,
      classified.checkout.filename
    ),
    period
  );
  const punches = parsePunchRows(
    await readFirstSheetFromBuffer(
      classified.punches.bytes,
      classified.punches.filename
    ),
    period
  );
  const outer = parseNoteOuterRows(
    await readFirstSheetFromBuffer(
      classified.noteOuter.bytes,
      classified.noteOuter.filename
    )
  );
  const noteClicks = (
    await Promise.all(
      classified.drilldowns.map(async (file) =>
        parseNoteDrilldownRows(
          await readFirstSheetFromBuffer(file.bytes, file.filename),
          itemNameFromDrilldownFilename(file.filename)
        )
      )
    )
  ).flat();

  const outerNames = new Set(outer.map((item) => item.name));
  const drilldownNames = new Set(
    classified.drilldowns.map((file) =>
      itemNameFromDrilldownFilename(file.filename)
    )
  );
  const noteOuterComplete =
    outerNames.size > 0 &&
    [...outerNames].every((name) => drilldownNames.has(name)) &&
    drilldownNames.size === outerNames.size;

  return {
    classified,
    checkoutLines,
    punchPairs: punches.pairs,
    noteClicks,
    noteOuterComplete,
  };
}
