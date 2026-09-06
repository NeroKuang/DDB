import type { Instrumentation } from "next";

import { isBenignStreamAbortError } from "@/lib/benign-stream-abort";

/**
 * Demote known Next 16.3 client-abort RSC noise; real failures still go to
 * structured logs. Avoid importing server-only/fs modules here — this file
 * can load in the Edge instrumentation graph.
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

  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "NonError";
  console.error(
    JSON.stringify({
      level: "error",
      context: "next-onRequestError",
      name,
      message,
      meta: {
        routePath: context.routePath,
        routeType: context.routeType,
        routerKind: context.routerKind,
      },
      at: new Date().toISOString(),
    })
  );
};
