/** Map raw failures to safe Traditional Chinese copy for the UI.
 * Safe for Client Components — no Node built-ins.
 */
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
