/** iCHEF 兌換／贈送類注記：POS 售價應為 0，不計入缺價警告。 */
export function isGiftItemName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) {
    return false;
  }
  return (
    /兌換|贈送|贈品|招待/.test(trimmed) ||
    trimmed.includes("兌換券") ||
    trimmed.startsWith("生日兌換")
  );
}

export function giftItemLabel(name: string, isGift: boolean): string | null {
  if (!isGift && !isGiftItemName(name)) {
    return null;
  }
  return "兌換／贈送品（售價 0 為正常）";
}
