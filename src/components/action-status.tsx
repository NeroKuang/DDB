/** Inline feedback for server actions — never show raw stack traces. */
export function ActionStatus({
  ok,
  message,
}: {
  ok: boolean;
  message: string;
}) {
  if (!message) {
    return null;
  }
  return (
    <p
      role="status"
      className={
        ok ? "text-sm text-emerald-700" : "text-sm text-[var(--danger)]"
      }
    >
      {message}
    </p>
  );
}
