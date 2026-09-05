import { seedAdminIfEmpty } from "@/auth/accounts";
import { seedZhongshanStoreAndStaff } from "@/staff/seed-zhongshan";
import { seedJulyPeriodStaffFromFixture } from "@/pay-period-staff/manage";
import { seedStaffTitlesFromFixture } from "@/staff-titles/manage";

/** Seed Admin (if env present) and 中山門市／店員 master for local demos. */
export async function ensureAppBootstrap(): Promise<void> {
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
