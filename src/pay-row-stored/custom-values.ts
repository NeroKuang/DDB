import type { PayRowOriginals } from "@/compile/types";

/** Extra key in valuesJson for Admin-filled 自訂薪資項目 amounts. */
export const CUSTOM_VALUES_JSON_KEY = "_custom";

export type SavedStoredWithCustom = Partial<PayRowOriginals> & {
  [CUSTOM_VALUES_JSON_KEY]?: Record<string, number>;
};

export function customStoredFromSaved(
  saved: SavedStoredWithCustom | undefined
): Record<string, number> {
  const raw = saved?.[CUSTOM_VALUES_JSON_KEY];
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const out: Record<string, number> = {};
  for (const [id, value] of Object.entries(raw)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      out[id] = value;
    }
  }
  return out;
}

export function builtinsFromSaved(
  saved: SavedStoredWithCustom | undefined
): Partial<PayRowOriginals> {
  if (!saved) {
    return {};
  }
  const { [CUSTOM_VALUES_JSON_KEY]: _custom, ...rest } = saved;
  return rest;
}
