/** Digits-only phone for login defaults and initial password. */
export function digitsOnlyPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function defaultLoginUsernameFromPhone(phone: string): string {
  const digits = digitsOnlyPhone(phone.trim());
  if (!digits) {
    throw new Error("聯絡電話不可空白");
  }
  return digits;
}

/** ADR-0082: initial personal password = last four digits of contact phone. */
export function defaultPasswordFromContactPhone(phone: string): string {
  const digits = digitsOnlyPhone(phone.trim());
  if (digits.length < 4) {
    throw new Error("聯絡電話至少需 4 位數字才能產生初始密碼");
  }
  return digits.slice(-4);
}
