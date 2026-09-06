"use client";

/**
 * Lightweight contextual hint for admin/tooling UX (not a toast).
 * Prefer one short sentence + optional action link.
 */
export function UiHint({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <aside className="ui-hint ui-enter" role="note">
      <div className="min-w-0 flex-1">{children}</div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </aside>
  );
}
