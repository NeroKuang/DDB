import "server-only";

import { appendErrorLog } from "@/lib/error-log";

function serializeForStdout(error: unknown): {
  name: string;
  message: string;
  stack: string | null;
} {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    };
  }
  return { name: "NonError", message: String(error), stack: null };
}

/**
 * Server-only error logging.
 * Always writes structured lines to stdout (Zeabur runtime logs).
 * Optional file under storage/logs when ERROR_LOG_TO_FILE=1 (local/debug).
 */
export function logServerError(
  context: string,
  error: unknown,
  meta?: Record<string, unknown>
): void {
  const serialized = serializeForStdout(error);
  console.error(
    JSON.stringify({
      level: "error",
      context,
      ...serialized,
      meta: meta ?? null,
      at: new Date().toISOString(),
    })
  );
  // Zeabur disk is ephemeral — file log is opt-in for local debugging only.
  if (process.env.ERROR_LOG_TO_FILE === "1") {
    appendErrorLog({ context, error, meta });
  }
}
