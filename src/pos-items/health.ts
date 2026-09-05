import type { StoredPosItem } from "@/pos-items/manage";

export type PosItemHealth = {
  total: number;
  giftCount: number;
  billableCount: number;
  zeroPriceBillable: StoredPosItem[];
  zeroPriceBillableCount: number;
  allBillableZero: boolean;
  suggestion: string | null;
};

export function analyzePosItemHealth(
  items: readonly StoredPosItem[]
): PosItemHealth {
  const giftItems = items.filter((item) => item.isGift);
  const billable = items.filter((item) => !item.isGift);
  const zeroPriceBillable = billable.filter((item) => item.unitPrice === 0);

  let suggestion: string | null = null;
  if (items.length === 0) {
    suggestion = "請先執行網頁取數或上傳，再從本期匯入偵測品項。";
  } else if (
    billable.length > 0 &&
    zeroPriceBillable.length === billable.length
  ) {
    suggestion =
      "所有非贈送品售價皆為 0：請按「從匯入建議售價」一次帶入，或至品項清單逐筆填寫 POS 售價。";
  } else if (zeroPriceBillable.length > 0) {
    suggestion = `尚有 ${zeroPriceBillable.length} 個非贈送品未設定售價，業績面注記的總賣出／常態抽成會顯示 0。`;
  }

  return {
    total: items.length,
    giftCount: giftItems.length,
    billableCount: billable.length,
    zeroPriceBillable,
    zeroPriceBillableCount: zeroPriceBillable.length,
    allBillableZero:
      billable.length > 0 && zeroPriceBillable.length === billable.length,
    suggestion,
  };
}
