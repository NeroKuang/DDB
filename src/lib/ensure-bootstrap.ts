import { seedAdminIfEmpty } from "@/auth/accounts";
import { seedZhongshanStoreAndStaff } from "@/staff/seed-zhongshan";
import { seedJulyPeriodStaffFromFixture } from "@/pay-period-staff/manage";
import { seedStaffTitlesFromFixture } from "@/staff-titles/manage";

const globalForBootstrap = globalThis as unknown as {
  ddbBootstrapPromise?: Promise<void>;
};

async function runAppBootstrap(): Promise<void> {
  // `next build` must not open Postgres (Docker/Zeabur builder has no DB).
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }
  try {
    await seedAdminIfEmpty();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/ADMIN_USERNAME and ADMIN_PASSWORD/.test(message)) {
      throw error;
    }
  }
  await seedZhongshanStoreAndStaff();
  await seedJulyPeriodStaffFromFixture();
  await seedStaffTitlesFromFixture();
}

/** Seed Admin (if env present) and 中山門市／店員 master — once per process. */
export async function ensureAppBootstrap(): Promise<void> {
  if (!globalForBootstrap.ddbBootstrapPromise) {
    globalForBootstrap.ddbBootstrapPromise = runAppBootstrap().catch(
      (error) => {
        globalForBootstrap.ddbBootstrapPromise = undefined;
        throw error;
      }
    );
  }
  await globalForBootstrap.ddbBootstrapPromise;
}

/** Test helper: clear process-level bootstrap memo. */
export function resetAppBootstrapForTests(): void {
  globalForBootstrap.ddbBootstrapPromise = undefined;
}
