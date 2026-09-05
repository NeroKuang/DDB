import { mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  appendErrorLog,
  errorLogFilePath,
  redactSecrets,
  taipeiLogDateKey,
} from "@/lib/error-log";

describe("error-log", () => {
  it("appends under storage/logs/yyyy-mm-dd/errors.log", () => {
    const root = mkdtempSync(path.join(tmpdir(), "ddb-error-log-"));
    try {
      const now = new Date("2026-09-06T01:00:00.000Z"); // Asia/Taipei 09:00
      const written = appendErrorLog({
        context: "web-fetch",
        error: new Error("取數超時"),
        meta: { periodKey: "2026-08" },
        now,
        root,
      });
      const expected = errorLogFilePath(taipeiLogDateKey(now), root);
      expect(written).toBe(expected);
      const text = readFileSync(expected, "utf8");
      expect(text).toContain("[web-fetch]");
      expect(text).toContain("取數超時");
      expect(text).toContain('"periodKey": "2026-08"');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("redacts LOGIN_PASSWORD and password= patterns", () => {
    const redacted = redactSecrets(
      "login failed password=secret123 and also SECRETVALUE",
      { LOGIN_PASSWORD: "SECRETVALUE" }
    );
    expect(redacted).not.toContain("SECRETVALUE");
    expect(redacted).toContain("[REDACTED]");
    expect(redacted).toMatch(/password=\[REDACTED\]/i);
  });
});
