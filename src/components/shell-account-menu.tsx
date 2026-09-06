"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { AccountRole } from "@prisma/client";
import { ChangeOwnPasswordForm } from "@/components/account-panels";
import { DialogShellChrome } from "@/components/cathedral-ornament";
import { IconButton } from "@/components/icon-button";
import { SignOutButton } from "@/components/sign-out-button";
import { IconClose, IconMenu, IconUser } from "@/components/ui-icons";

function roleLabel(role: AccountRole): string {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "SUPERVISOR":
      return "Supervisor";
    case "PERSONAL":
      return "personal";
    default:
      return role;
  }
}

export function ShellAccountMenu({
  username,
  role,
  primaryNickname,
}: {
  username: string;
  role: AccountRole;
  primaryNickname?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  const displayRole = roleLabel(role);

  return (
    <>
      <div className="flex min-w-0 items-center justify-end gap-2">
        <div className="min-w-0 text-right">
          <p className="truncate text-sm font-medium">{username}</p>
          <p className="truncate text-[0.6875rem] text-muted">
            {displayRole}
            {primaryNickname ? ` · ${primaryNickname}` : ""}
          </p>
        </div>
        <IconButton
          label="個人檔案"
          className="shrink-0"
          onClick={() => setOpen(true)}
        >
          <IconUser />
        </IconButton>
        <SignOutButton className="shrink-0" />
      </div>

      <dialog
        ref={dialogRef}
        className="payroll-dialog max-w-md"
        onClose={() => setOpen(false)}
        aria-labelledby={titleId}
      >
        <DialogShellChrome>
          <header className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="section-title font-display">
                個人檔案
              </h2>
              <p className="mt-1.5 text-sm text-muted">
                登入名與密碼；店員主檔仍由 Admin 維護。
              </p>
            </div>
            <IconButton label="關閉" size="sm" onClick={() => setOpen(false)}>
              <IconClose />
            </IconButton>
          </header>

          <dl className="grid gap-2 text-sm sm:grid-cols-[6.5rem_1fr]">
            <dt className="text-muted">登入名</dt>
            <dd className="font-medium">{username}</dd>
            <dt className="text-muted">角色</dt>
            <dd>{displayRole}</dd>
            {primaryNickname ? (
              <>
                <dt className="text-muted">店員暱稱</dt>
                <dd>{primaryNickname}</dd>
              </>
            ) : null}
          </dl>

          <ChangeOwnPasswordForm compact />
        </DialogShellChrome>
      </dialog>
    </>
  );
}

export function ShellTopBar({
  username,
  role,
  primaryNickname,
  onOpenMenu,
}: {
  username: string;
  role: AccountRole;
  primaryNickname?: string | null;
  onOpenMenu: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_96%,var(--accent-soft))] px-4 py-2.5 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 md:hidden">
        <IconButton label="開啟選單" onClick={onOpenMenu}>
          <IconMenu />
        </IconButton>
        <span className="font-display text-sm font-semibold">DDB</span>
      </div>
      <div className="ml-auto min-w-0">
        <ShellAccountMenu
          username={username}
          role={role}
          primaryNickname={primaryNickname}
        />
      </div>
    </header>
  );
}
