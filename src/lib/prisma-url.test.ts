import { describe, expect, it } from "vitest";
import { withPrismaPoolParams } from "@/lib/prisma-url";

describe("withPrismaPoolParams", () => {
  it("adds connection_limit and pool_timeout when missing", () => {
    expect(
      withPrismaPoolParams("postgresql://u:p@localhost:5432/ddb")
    ).toContain("connection_limit=10");
    expect(
      withPrismaPoolParams("postgresql://u:p@localhost:5432/ddb")
    ).toContain("pool_timeout=30");
  });

  it("preserves explicit pool settings", () => {
    const url = withPrismaPoolParams(
      "postgresql://u:p@localhost:5432/ddb?connection_limit=5&pool_timeout=60"
    );
    expect(url).toContain("connection_limit=5");
    expect(url).toContain("pool_timeout=60");
  });
});
