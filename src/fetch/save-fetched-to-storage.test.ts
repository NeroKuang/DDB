import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import type { FetchedIchefFiles } from "@/fetch/ichef-web-fetch";
import { saveFetchedFilesToStorage } from "@/fetch/save-fetched-to-storage";

describe("saveFetchedFilesToStorage", () => {
  it("writes checkout, punches, note outer and drill-downs under storage/ichef/<range>", () => {
    const root = mkdtempSync(path.join(tmpdir(), "ddb-storage-"));
    const fetched: FetchedIchefFiles = {
      checkout: {
        filename: "結帳／作廢紀錄.xlsx",
        bytes: Buffer.from("checkout"),
      },
      punches: { filename: "打卡紀錄.xlsx", bytes: Buffer.from("punches") },
      noteOuter: {
        filename: "modifier-analysis.xlsx",
        bytes: Buffer.from("outer"),
      },
      noteDrilldowns: [
        {
          itemName: "修女貪杯",
          file: { filename: "修女貪杯.xlsx", bytes: Buffer.from("drill") },
        },
      ],
    };
    try {
      const saved = saveFetchedFilesToStorage(
        fetched,
        { startDate: "2026-06-30", endDate: "2026-08-01" },
        root
      );
      expect(saved.dir).toBe(
        path.join(root, "storage", "ichef", "2026-06-30_2026-08-01")
      );
      expect(saved.paths).toHaveLength(4);
      expect(
        readFileSync(path.join(saved.dir, "結帳_作廢紀錄.xlsx"), "utf8")
      ).toBe("checkout");
      expect(existsSync(path.join(saved.dir, "修女貪杯.xlsx"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
