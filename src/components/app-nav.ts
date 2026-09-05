import type { AccountRole } from "@prisma/client";

export type NavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

export type NavSection = {
  title: string;
  items: NavItem[];
  /** Hide entire section for personal accounts. */
  hideForPersonal?: boolean;
};

export const APP_NAV: NavSection[] = [
  {
    title: "薪資",
    items: [
      { href: "/", label: "中控台" },
      { href: "/payroll", label: "薪資報表" },
      { href: "/performance", label: "業績面" },
    ],
  },
  {
    title: "店員",
    hideForPersonal: true,
    items: [
      { href: "/staff", label: "店員主檔" },
      { href: "/period-staff", label: "本期店員" },
      { href: "/staff-titles", label: "職稱標籤" },
    ],
  },
  {
    title: "任務",
    hideForPersonal: true,
    items: [
      { href: "/pos-items", label: "品項管理" },
      { href: "/template-tasks", label: "模板任務" },
      { href: "/ad-hoc-tasks", label: "追加任務" },
    ],
  },
  {
    title: "系統",
    hideForPersonal: true,
    items: [
      { href: "/accounts", label: "帳號與密碼" },
      { href: "/storage-retention", label: "raw 保留策略", adminOnly: true },
    ],
  },
];

export function navSectionsForRole(role: AccountRole): NavSection[] {
  if (role === "PERSONAL") {
    return [
      {
        title: "我的",
        items: [{ href: "/performance", label: "業績面" }],
      },
    ];
  }
  return APP_NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.adminOnly || role === "ADMIN"),
  })).filter((section) => section.items.length > 0);
}
