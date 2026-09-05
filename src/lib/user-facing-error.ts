import { appendErrorLog } from "@/lib/error-log";

/** Map raw failures to safe Traditional Chinese copy for the UI. */
export function toUserFacingMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.trim();
  if (!message) {
    return fallback;
  }

  if (shouldHideTechnicalMessage(message)) {
    return fallback;
  }

  return message;
}

function shouldHideTechnicalMessage(message: string): boolean {
  if (/^invalid\b/i.test(message)) {
    return true;
  }
  if (/prisma/i.test(message)) {
    return true;
  }
  if (/^\s*at\s+/m.test(message)) {
    return true;
  }
  if (/^(TypeError|ReferenceError|SyntaxError):/i.test(message)) {
    return true;
  }
  if (/Unexpected token|is not defined|Cannot read propert/i.test(message)) {
    return true;
  }
  if (message.length > 240) {
    return true;
  }
  return false;
}

/** Console + storage/logs/yyyy-mm-dd/errors.log (Asia/Taipei). Never throws. */
export function logServerError(
  context: string,
  error: unknown,
  meta?: Record<string, unknown>
): void {
  console.error(`[${context}]`, error);
  appendErrorLog({ context, error, meta });
}
