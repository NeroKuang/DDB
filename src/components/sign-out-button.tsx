"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

type SignOutButtonProps = {
  variant?: "sidebar" | "toolbar";
  className?: string;
};

export function SignOutButton({
  variant = "sidebar",
  className = "",
}: SignOutButtonProps) {
  const [pending, setPending] = useState(false);

  async function handleSignOut(): Promise<void> {
    setPending(true);
    try {
      await signOut({ callbackUrl: "/login", redirect: true });
    } catch {
      setPending(false);
    }
  }

  const base =
    variant === "toolbar"
      ? "btn-secondary px-3 py-1.5 text-sm"
      : "w-full rounded border border-[color-mix(in_srgb,var(--sidebar-fg)_35%,transparent)] bg-[color-mix(in_srgb,var(--sidebar-fg)_8%,var(--sidebar))] px-3 py-2 text-sm text-[var(--sidebar-fg)] hover:bg-[color-mix(in_srgb,var(--sidebar-fg)_14%,var(--sidebar))] disabled:opacity-60";

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      disabled={pending}
      className={`${base} ${className}`.trim()}
    >
      {pending ? "登出中…" : "登出"}
    </button>
  );
}

export function SignOutLink({ className = "" }: { className?: string }) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void signOut({ callbackUrl: "/login", redirect: true });
      }}
      className={`text-xs underline underline-offset-2 text-[var(--sidebar-muted)] hover:text-[var(--sidebar-fg)] disabled:opacity-60 ${className}`.trim()}
    >
      {pending ? "登出中…" : "登出"}
    </button>
  );
}
