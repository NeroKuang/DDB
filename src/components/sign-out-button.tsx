"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { IconButton } from "@/components/icon-button";
import { IconLogout } from "@/components/ui-icons";

type SignOutButtonProps = {
  className?: string;
  size?: "sm" | "md";
};

export function SignOutButton({
  className = "",
  size = "md",
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

  return (
    <IconButton
      label={pending ? "登出中…" : "登出"}
      size={size}
      disabled={pending}
      className={className}
      onClick={() => void handleSignOut()}
    >
      <IconLogout />
    </IconButton>
  );
}
