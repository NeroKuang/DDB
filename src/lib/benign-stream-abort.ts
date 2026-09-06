/**
 * Next.js 16.3 may report client-aborted RSC streams as:
 *   Error: The destination stream closed early.
 * That is usually navigate-away / refresh / proxy close — not an app failure
 * (vercel/next.js#96704).
 */
export function isBenignStreamAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return /destination stream closed early/i.test(error.message);
}
