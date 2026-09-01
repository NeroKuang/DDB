import { describe, expect, it } from "vitest";
import {
  defaultLoginUsernameFromPhone,
  defaultPasswordFromContactPhone,
} from "@/staff/phone-auth";

describe("phone-auth", () => {
  it("uses digits-only phone as login username", () => {
    expect(defaultLoginUsernameFromPhone("0912-345-678")).toBe("0912345678");
  });

  it("uses last four digits as default password", () => {
    expect(defaultPasswordFromContactPhone("0912-345-678")).toBe("5678");
  });

  it("rejects phone with fewer than 4 digits for password", () => {
    expect(() => defaultPasswordFromContactPhone("12")).toThrow(/4 位/);
  });
});
