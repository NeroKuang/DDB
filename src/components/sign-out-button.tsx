"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded border border-zinc-300 px-3 py-2 text-sm"
    >
      登出
    </button>
  );
}
