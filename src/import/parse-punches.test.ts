import { parsePunchFile } from "@/import/parse-punches";
import {
  JULY_2026_PERIOD,
  july2026FixturePaths,
} from "@/lib/july-2026-fixtures";

describe("parsePunchFile", () => {
  it("does not invent hours for 無下班記錄", async () => {
    const period = {
      start: new Date(JULY_2026_PERIOD.startIso),
      end: new Date(JULY_2026_PERIOD.endIso),
    };
    const parsed = await parsePunchFile(july2026FixturePaths().punches, period);
    expect(parsed.unpaired.length).toBeGreaterThan(0);
    const fenMing = parsed.pairs.filter((pair) => pair.nickname === "粉冥");
    expect(fenMing.length).toBeGreaterThan(0);
    expect(fenMing.every((pair) => pair.hours > 0)).toBe(true);
  });
});
