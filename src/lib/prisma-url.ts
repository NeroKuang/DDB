/**
 * Ensure Prisma Postgres URLs carry pool settings suitable for Next + long
 * Playwright jobs (default limit 3 / pool_timeout 10s exhausts under UI poll).
 */
export function withPrismaPoolParams(
  databaseUrl: string,
  defaults: { connectionLimit?: number; poolTimeoutSec?: number } = {}
): string {
  const connectionLimit = defaults.connectionLimit ?? 10;
  const poolTimeoutSec = defaults.poolTimeoutSec ?? 30;
  try {
    const url = new URL(databaseUrl);
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", String(connectionLimit));
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", String(poolTimeoutSec));
    }
    return url.toString();
  } catch {
    return databaseUrl;
  }
}
