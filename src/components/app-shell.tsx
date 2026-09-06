"use client";

import { Suspense, useState } from "react";
import type { AccountRole } from "@prisma/client";
import { AppSidebar } from "@/components/app-sidebar";
import { ShellTopBar } from "@/components/shell-account-menu";
import { ShellPeriodBar } from "@/components/shell-period-bar";
import type { PeriodOption } from "@/pay-period/list-period-options";

export function AppShell({
  role,
  username,
  primaryNickname,
  periodOptions,
  currentPeriodKey,
  children,
}: {
  role: AccountRole;
  username: string;
  primaryNickname?: string | null;
  periodOptions?: PeriodOption[];
  currentPeriodKey?: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const showPeriodBar =
    periodOptions && periodOptions.length > 0 && currentPeriodKey;

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
      <Suspense fallback={null}>
        <AppSidebar
          role={role}
          mobileOpen={mobileOpen}
          onNavigate={() => setMobileOpen(false)}
        />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <ShellTopBar
          username={username}
          role={role}
          primaryNickname={primaryNickname}
          onOpenMenu={() => setMobileOpen(true)}
        />
        {showPeriodBar ? (
          <ShellPeriodBar
            options={periodOptions}
            currentPeriodKey={currentPeriodKey}
          />
        ) : null}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
