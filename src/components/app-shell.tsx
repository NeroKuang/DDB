"use client";

import { useState } from "react";
import type { AccountRole } from "@prisma/client";
import { AppSidebar, MobileNavBar } from "@/components/app-sidebar";

export function AppShell({
  role,
  username,
  primaryNickname,
  children,
}: {
  role: AccountRole;
  username: string;
  primaryNickname?: string | null;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-full flex-1">
      {mobileOpen ? (
        <button
          type="button"
          aria-label="關閉選單"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <AppSidebar
        role={role}
        username={username}
        primaryNickname={primaryNickname}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNavBar onOpenMenu={() => setMobileOpen(true)} />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
