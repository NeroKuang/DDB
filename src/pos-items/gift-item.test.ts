import { describe, expect, it } from "vitest";
import { isGiftItemName } from "@/pos-items/gift-item";

describe("isGiftItemName", () => {
  it("detects iCHEF redemption / gift note names", () => {
    expect(isGiftItemName("兌換券")).toBe(true);
    expect(isGiftItemName("拍立得贈送（相印紙)")).toBe(true);
    expect(isGiftItemName("生日兌換生寫真+shot1排")).toBe(true);
    expect(isGiftItemName("桌遊日籌碼兌換")).toBe(true);
  });

  it("does not mark regular menu items as gift", () => {
    expect(isGiftItemName("修女貪杯")).toBe(false);
    expect(isGiftItemName("紅茶")).toBe(false);
  });
});
