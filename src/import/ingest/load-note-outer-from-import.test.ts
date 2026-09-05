import { describe, expect, it } from "vitest";
import { buildNoteItemUnitPriceMap } from "@/import/parse-note-analysis";
import { loadNoteItemUnitPricesForPeriod } from "@/import/ingest/load-note-outer-from-import";

describe("loadNoteItemUnitPricesForPeriod", () => {
  it("builds unit prices from note outer rows", () => {
    const prices = buildNoteItemUnitPriceMap([
      { name: "修女貪杯", clicks: 10, priceTotal: 1000 },
    ]);
    expect(prices.get("修女貪杯")).toBe(100);
  });

  it("returns empty map when store has no active import", async () => {
    const prices = await loadNoteItemUnitPricesForPeriod(
      "missing-store",
      "2099-01",
      ["修女貪杯"]
    );
    expect(prices.size).toBe(0);
  });
});
