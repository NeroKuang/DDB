"use client";

import { useActionState } from "react";
import {
  recountPayPeriodAction,
  type RecountActionState,
} from "@/payroll/recount-actions";

const initial: RecountActionState = { ok: false, message: "" };

export function RecountPayPeriodPanel({
  storeId,
  locked,
  isAdmin,
}: {
  storeId: string;
  locked: boolean;
  isAdmin: boolean;
}) {
  const [state, action, pending] = useActionState(
    recountPayPeriodAction,
    initial
  );

  if (!isAdmin || locked) {
    return null;
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="storeId" value={storeId} />
      <button
        type="submit"
        disabled={pending}
        className="text-sm underline underline-offset-2 disabled:opacity-60"
      >
        {pending ? "重算中…" : "重算本期"}
      </button>
      {state.message ? (
        <span
          role="status"
          className={
            state.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"
          }
        >
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
