import type { CheckoutNoteLine } from "@/import/parse-checkout";
import { parseCheckoutRows } from "@/import/parse-checkout";
import type {
  NoteAnalysisClick,
  NoteOuterItem,
} from "@/import/parse-note-analysis";
import {
  itemNameFromDrilldownFilename,
  noteOuterMatchesDrilldowns,
  parseNoteDrilldownRows,
  resolveNoteOuterItems,
} from "@/import/parse-note-analysis";
import type { PunchPair } from "@/import/parse-punches";
import { parsePunchRows } from "@/import/parse-punches";
import { readFirstSheetFromBuffer } from "@/import/read-xlsx-sheet";
import {
  classifyUploadedFiles,
  validateUploadSet,
  type UploadFileInput,
} from "@/import/upload-ichef-files";

/** Keep one drill-down file per 品項名（iCHEF 偶爾同名重複下載）. */
function dedupeDrilldownFiles(files: UploadFileInput[]): UploadFileInput[] {
  const byName = new Map<string, UploadFileInput>();
  for (const file of files) {
    const name = itemNameFromDrilldownFilename(file.filename);
    const existing = byName.get(name);
    if (!existing || file.bytes.length > existing.bytes.length) {
      byName.set(name, file);
    }
  }
  return [...byName.values()];
}

export type ParsedUploadSet = {
  classified: ReturnType<typeof classifyUploadedFiles>;
  checkoutLines: CheckoutNoteLine[];
  punchPairs: PunchPair[];
  noteClicks: NoteAnalysisClick[];
  noteOuterItems: NoteOuterItem[];
  noteOuterComplete: boolean;
};

export async function parseUploadSet(
  files: UploadFileInput[],
  period: { start: Date; end: Date },
  options?: { noteOuterItems?: NoteOuterItem[] }
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
  const drilldownFiles = dedupeDrilldownFiles(classified.drilldowns);
  const drilldownNames = drilldownFiles.map((file) =>
    itemNameFromDrilldownFilename(file.filename)
  );
  const { items: outer, complete: noteOuterComplete } =
    await resolveNoteOuterItems({
      domScrape: options?.noteOuterItems,
      noteOuterBytes: classified.noteOuter.bytes,
      noteOuterLabel: classified.noteOuter.filename,
      drilldownItemNames: drilldownNames,
    });
  const noteClicks = (
    await Promise.all(
      drilldownFiles.map(async (file) =>
        parseNoteDrilldownRows(
          await readFirstSheetFromBuffer(file.bytes, file.filename),
          itemNameFromDrilldownFilename(file.filename)
        )
      )
    )
  ).flat();

  return {
    classified,
    checkoutLines,
    punchPairs: punches.pairs,
    noteClicks,
    noteOuterItems: outer,
    noteOuterComplete,
  };
}
