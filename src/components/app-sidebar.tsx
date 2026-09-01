"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AccountRole } from "@prisma/client";
import { navSectionsForRole } from "@/components/app-nav";
import { SignOutButton } from "@/components/sign-out-button";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({
  role,
  username,
  primaryNickname,
  mobileOpen,
  onNavigate,
}: {
  role: AccountRole;
  username: string;
  primaryNickname?: string | null;
  mobileOpen?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const sections = navSectionsForRole(role);

  return (
    <aside
      className={`flex w-56 shrink-0 flex-col border-r border-[color-mix(in_srgb,var(--sidebar-fg)_12%,var(--sidebar))] bg-[var(--sidebar)] text-[var(--sidebar-fg)] ${
        mobileOpen ? "fixed inset-y-0 left-0 z-40 shadow-lg" : "hidden md:flex"
      }`}
    >
      <div className="border-b border-[color-mix(in_srgb,var(--sidebar-fg)_12%,var(--sidebar))] px-4 py-4">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-wide text-[var(--sidebar-fg)]"
          onClick={onNavigate}
        >
          DDB
        </Link>
        <p className="font-display text-xs tracking-widest text-[var(--gothic-gold)] uppercase">
          業績補償
        </p>
        <p className="mt-1 text-xs text-[var(--sidebar-muted)]">
          {username}（{role}）{primaryNickname ? `／${primaryNickname}` : ""}
        </p>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {sections.map((section) => (
          <div key={section.title} className="mb-4">
            <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-[var(--sidebar-muted)]">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={`block rounded px-2 py-1.5 text-sm ${
                        active
                          ? "bg-[var(--accent)] font-medium text-white"
                          : "text-[color-mix(in_srgb,var(--sidebar-fg)_88%,transparent)] hover:bg-[color-mix(in_srgb,var(--sidebar-fg)_10%,var(--sidebar))]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-[color-mix(in_srgb,var(--sidebar-fg)_12%,var(--sidebar))] p-3">
        <SignOutButton />
      </div>
    </aside>
  );
}

export function MobileNavBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 md:hidden">
      <button
        type="button"
        onClick={onOpenMenu}
        className="btn-secondary px-3 py-1.5"
        aria-label="開啟選單"
      >
        選單
      </button>
      <span className="font-display text-sm font-semibold">DDB</span>
      <span className="w-12" />
    </header>
  );
}
