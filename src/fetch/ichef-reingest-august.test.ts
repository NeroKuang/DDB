/**
 * Live: re-fetch August iCHEF files and replace active import.
 * Not in default `npm test` — run explicitly.
 */
import {
  applyDotEnvFile,
  fetchIchefBusinessReports,
  readIchefCredentialsFromEnv,
} from "@/fetch/ichef-web-fetch";
import { runIngestPipeline } from "@/import/ingest/run-ingest-pipeline";
import { isNoteOuterFilename } from "@/import/upload-ichef-files";
import { prisma } from "@/lib/prisma";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";
import {
  noteOuterMatchesDrilldowns,
  encodeNoteItemNameForFilename,
} from "@/import/parse-note-analysis";

applyDotEnvFile();
applyDotEnvFile(".env.local");

const PERIOD_KEY = "2026-08";
const RANGE = { startDate: "2026-07-31", endDate: "2026-09-01" };

describe("reingest August with modifier-analysis outer", () => {
  const creds = readIchefCredentialsFromEnv();

  it.skipIf(!creds)(
    "fetches, rejects staff-summary outer shape, ingests, marks fetch SUCCEEDED",
    async () => {
      if (!creds) {
        return;
      }

      const store = await prisma.store.findFirstOrThrow({
        where: { code: ZHONGSHAN_STORE_CODE },
      });
      const period = await prisma.payPeriod.findUniqueOrThrow({
        where: {
          storeId_periodKey: { storeId: store.id, periodKey: PERIOD_KEY },
        },
      });

      const fetched = await fetchIchefBusinessReports(creds, RANGE);
      expect(isNoteOuterFilename(fetched.noteOuter.filename)).toBe(true);
      expect(fetched.noteOuter.filename.startsWith("文字註記分析")).toBe(false);
      expect(fetched.noteOuterItems?.length ?? 0).toBeGreaterThan(10);
      expect(fetched.noteDrilldowns.length).toBeGreaterThan(10);
      expect(
        noteOuterMatchesDrilldowns(
          fetched.noteOuterItems ?? [],
          fetched.noteDrilldowns.map((d) => d.itemName)
        )
      ).toBe(true);

      const ingested = await runIngestPipeline({
        payPeriodId: period.id,
        storeId: store.id,
        storeCode: store.code || ZHONGSHAN_STORE_CODE,
        periodKey: PERIOD_KEY,
        source: "WEB_FETCH",
        files: [
          fetched.checkout,
          fetched.punches,
          fetched.noteOuter,
          // Same rename as web-fetch manage: drill-down filename = outer 品項名
          ...fetched.noteDrilldowns.map((d) => ({
            filename: `${encodeNoteItemNameForFilename(d.itemName)}_${RANGE.startDate}~${RANGE.endDate}.xlsx`,
            bytes: d.file.bytes,
          })),
        ],
        fileRange: RANGE,
        noteOuterItems: fetched.noteOuterItems,
      });

      await prisma.payPeriod.update({
        where: { id: period.id },
        data: {
          fetchStatus: "SUCCEEDED",
          fetchFinishedAt: new Date(),
          fetchErrorMessage: null,
          fetchRangeStart: RANGE.startDate,
          fetchRangeEnd: RANGE.endDate,
          activeImportRunId: ingested.importRunId,
        },
      });

      const run = await prisma.importRun.findUniqueOrThrow({
        where: { id: ingested.importRunId },
        include: {
          rawFiles: { where: { kind: "NOTE_OUTER" } },
          noteOuterItems: { take: 5, orderBy: { name: "asc" } },
          _count: {
            select: {
              checkoutLines: true,
              punchPairs: true,
              noteClicks: true,
              noteOuterItems: true,
            },
          },
        },
      });

      expect(run.status).toBe("SUCCEEDED");
      expect(run.noteOuterComplete).toBe(true);
      expect(run.rawFiles[0]?.originalName).toMatch(/^modifier-analysis/i);
      expect(run._count.noteOuterItems).toBe(fetched.noteDrilldowns.length);
      // Product-like sample (not staff nicknames)
      const outerNames = run.noteOuterItems.map((r) => r.name);
      expect(outerNames.some((n) => /貪杯|拍立得|薯條|啤酒|特調/.test(n))).toBe(
        true
      );

      const refreshed = await prisma.payPeriod.findUniqueOrThrow({
        where: { id: period.id },
      });
      expect(refreshed.fetchStatus).toBe("SUCCEEDED");
      expect(refreshed.fetchErrorMessage).toBeNull();
      expect(refreshed.activeImportRunId).toBe(ingested.importRunId);

      // eslint-disable-next-line no-console
      console.log("REINGEST_OK", {
        importRunId: ingested.importRunId,
        outerFile: run.rawFiles[0]?.originalName,
        noteOuterItems: run._count.noteOuterItems,
        noteClicks: run._count.noteClicks,
        checkoutLines: run._count.checkoutLines,
        punchPairs: run._count.punchPairs,
      });
    },
    900_000
  );
});
