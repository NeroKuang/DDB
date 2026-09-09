/** Empty / whitespace → 0; invalid text throws a Traditional Chinese error. */
export function parseMoneyFormField(
  raw: FormDataEntryValue | null | undefined,
  label: string
): number {
  const text = String(raw ?? "")
    .trim()
    .replace(/,/g, "");
  if (!text) {
    return 0;
  }
  const value = Number(text);
  if (!Number.isFinite(value)) {
    throw new Error(`${label}須為數字`);
  }
  if (value < 0) {
    throw new Error(`${label}不可為負`);
  }
  return value;
}
