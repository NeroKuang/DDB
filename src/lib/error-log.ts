import { appendFileSync, mkdirSync } from "fs";
import path from "path";

export type ErrorLogEntry = {
  context: string;
  error: unknown;
  meta?: Record<string, unknown>;
  /** Override clock (tests). */
  now?: Date;
  /** Override process.cwd() (tests). */
  root?: string;
};

/** Asia/Taipei calendar date as YYYY-MM-DD. */
export function taipeiLogDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function errorLogDirForDate(
  dateKey: string,
  root = process.cwd()
): string {
  return path.join(root, "storage", "logs", dateKey);
}

export function errorLogFilePath(
  dateKey: string,
  root = process.cwd()
): string {
  return path.join(errorLogDirForDate(dateKey, root), "errors.log");
}

function serializeError(error: unknown): {
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
  return {
    name: "NonError",
    message: String(error),
    stack: null,
  };
}

/** Strip known env secrets and common secret=value patterns from log text. */
export function redactSecrets(
  text: string,
  env: NodeJS.Dict<string> = process.env
): string {
  let out = text;
  const candidates = [
    env.LOGIN_PASSWORD,
    env.ADMIN_PASSWORD,
    env.CRON_SECRET,
    env.AUTH_SECRET,
    env.NEXTAUTH_SECRET,
    env.MINIO_SECRET_KEY,
    env.DATABASE_URL,
  ].filter((value): value is string => Boolean(value && value.length >= 4));

  for (const secret of candidates) {
    out = out.split(secret).join("[REDACTED]");
  }

  out = out.replace(
    /(password|passwd|secret|token|authorization)\s*[:=]\s*["']?[^\s"',}]+/gi,
    "$1=[REDACTED]"
  );
  return out;
}

function formatIsoTaipei(now: Date): string {
  // en-CA + time for a stable, readable stamp
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
  return `${date}T${time}+08:00`;
}

/**
 * Append one error block under storage/logs/yyyy-mm-dd/errors.log
 * (Asia/Taipei date). Never throws to callers — logging must not break request flow.
 */
export function appendErrorLog(entry: ErrorLogEntry): string | null {
  try {
    const now = entry.now ?? new Date();
    const root = entry.root ?? process.cwd();
    const dateKey = taipeiLogDateKey(now);
    const dir = errorLogDirForDate(dateKey, root);
    mkdirSync(dir, { recursive: true });
    const filePath = errorLogFilePath(dateKey, root);
    const serialized = serializeError(entry.error);
    const metaJson =
      entry.meta && Object.keys(entry.meta).length > 0
        ? JSON.stringify(entry.meta, null, 2)
        : null;
    const body = [
      `===== ${formatIsoTaipei(now)} [${entry.context}] =====`,
      `name: ${serialized.name}`,
      `message: ${serialized.message}`,
      serialized.stack ? `stack:\n${serialized.stack}` : "stack: (none)",
      metaJson ? `meta:\n${metaJson}` : null,
      "",
    ]
      .filter((line) => line != null)
      .join("\n");

    appendFileSync(filePath, redactSecrets(body), "utf8");
    return filePath;
  } catch (writeError) {
    console.error("[error-log] failed to write storage/logs", writeError);
    return null;
  }
}
