import type { Instrumentation } from "next";

import { isBenignStreamAbortError } from "@/lib/benign-stream-abort";

/**
 * Demote known Next 16.3 client-abort RSC noise; real failures still go to
 * logServerError (Zeabur Runtime Logs JSON).
 *
 * Note: Next may still print its own `⨯ Error: …` line before this hook runs.
 * Treat that alone as noise; take-number failures show as runWebFetchJob JSON.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  _request,
  context
) => {
  if (isBenignStreamAbortError(error)) {
    console.warn(
      JSON.stringify({
        level: "warn",
        context: "next-onRequestError",
        message: "benign RSC stream abort (client disconnected)",
        routePath: context.routePath,
        routeType: context.routeType,
        at: new Date().toISOString(),
      })
    );
    return;
  }

  const { logServerError } = await import("@/lib/log-server-error");
  logServerError("next-onRequestError", error, {
    routePath: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
  });
};
