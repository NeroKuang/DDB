/** Default 業績成數 (20%) for all staff unless Admin overrides. */
export const DEFAULT_COMMISSION_RATE = 0.2;

export function parseCommissionRateField(
  raw: FormDataEntryValue | null | undefined
): number {
  const text = String(raw ?? "").trim();
  if (!text) {
    return DEFAULT_COMMISSION_RATE;
  }
  const value = Number(text);
  if (Number.isNaN(value)) {
    return DEFAULT_COMMISSION_RATE;
  }
  return value;
}

/** Use master 業績成數; unset/zero legacy rows fall back to default. */
export function effectiveCommissionRate(rate: number): number {
  return rate > 0 ? rate : DEFAULT_COMMISSION_RATE;
}
