import { describe, expect, it } from "vitest";
import { isBenignStreamAbortError } from "@/lib/benign-stream-abort";

describe("isBenignStreamAbortError", () => {
  it("matches Next 16.3 client-abort stream noise", () => {
    expect(
      isBenignStreamAbortError(
        new Error("The destination stream closed early.")
      )
    ).toBe(true);
  });

  it("does not swallow real failures", () => {
    expect(isBenignStreamAbortError(new Error("網頁取數失敗"))).toBe(false);
  });
});
