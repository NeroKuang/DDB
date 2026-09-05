"use server";

import { logServerError } from "@/lib/user-facing-error";

/** Client error boundaries report here so failures land in storage/logs. */
export async function reportClientErrorAction(input: {
  context: string;
  message: string;
  digest?: string;
  stack?: string;
}): Promise<void> {
  const error = new Error(input.message);
  error.name = "ClientError";
  if (input.stack) {
    error.stack = input.stack;
  }
  logServerError(input.context || "client-error", error, {
    digest: input.digest ?? null,
    source: "client",
  });
}
