"use server";

import { logServerError } from "@/lib/log-server-error";

/** Client error boundaries report here so failures land in server logs. */
export async function reportClientErrorAction(input: {
  context: string;
  message: string;
  digest?: string;
  stack?: string;
}): Promise<void> {
  try {
    const error = new Error(input.message);
    error.name = "ClientError";
    if (input.stack) {
      error.stack = input.stack;
    }
    logServerError(input.context || "client-error", error, {
      digest: input.digest ?? null,
      source: "client",
    });
  } catch {
    // Never throw back into the error boundary (avoids update-depth loops).
  }
}
