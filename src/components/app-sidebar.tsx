"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { AccountRole } from "@prisma/client";
import { navSectionsForRole } from "@/components/app-nav";
import { PERIOD_QUERY_PARAM } from "@/components/period-selector";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({
  role,
  mobileOpen,
  onNavigate,
}: {
  role: AccountRole;
  mobileOpen?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const period = searchParams.get(PERIOD_QUERY_PARAM);
  const sections = navSectionsForRole(role);

  function navHref(href: string): string {
    if (!period) {
      return href;
    }
    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}${PERIOD_QUERY_PARAM}=${encodeURIComponent(period)}`;
  }

  return (
    <aside
      className={`shell-rail flex w-56 shrink-0 flex-col border-r border-[color-mix(in_srgb,var(--silver)_20%,var(--sidebar))] bg-[var(--sidebar)] text-[var(--sidebar-fg)] ${
        mobileOpen ? "fixed inset-y-0 left-0 z-40 shadow-lg" : "hidden md:flex"
      }`}
    >
      <div className="sidebar-brand px-4 py-3.5">
        <Link
          href="/"
          className="page-title text-[var(--sidebar-fg)]"
          onClick={onNavigate}
        >
          DDB
        </Link>
        <p className="mt-0.5 text-[0.6875rem] tracking-[0.18em] text-[var(--silver)] uppercase">
          薪資與業績
        </p>
        <hr className="brand-rule mt-2" />
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
                      href={navHref(item.href)}
                      onClick={onNavigate}
                      className={`block px-2 py-1.5 text-sm whitespace-nowrap [word-break:keep-all] ${
                        active
                          ? "nav-active font-medium"
                          : "text-[color-mix(in_srgb,var(--sidebar-fg)_88%,transparent)] hover:bg-[color-mix(in_srgb,var(--silver)_10%,var(--sidebar))]"
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
    </aside>
  );
}
