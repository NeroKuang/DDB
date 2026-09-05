import type { ShopInputs } from "@/compile/types";

/** Minimal shop inputs when no period-specific fixture exists. */
export function zhongshanEmptyShop(): ShopInputs {
  return {
    demeritUnitAmount: 230,
    staff: [],
    periodStaff: [],
    templateTasks: [],
    adHocTasks: [],
    rollups: {},
  };
}
