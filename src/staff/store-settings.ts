import type { AccountRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseCommissionRateField } from "@/lib/commission-rate";

function requireAdmin(actorRole: AccountRole): void {
  if (actorRole !== "ADMIN") {
    throw new Error("Only Admin can change 門市預設");
  }
}

export async function getStoreDefaultCommissionRate(
  storeId: string
): Promise<number> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { defaultCommissionRate: true },
  });
  return store?.defaultCommissionRate ?? 0.2;
}

export async function updateStoreDefaultCommissionRate(input: {
  actorRole: AccountRole;
  storeId: string;
  rate: number;
}): Promise<number> {
  requireAdmin(input.actorRole);
  if (input.rate < 0 || input.rate > 1) {
    throw new Error("業績成數須在 0～1 之間");
  }
  const row = await prisma.store.update({
    where: { id: input.storeId },
    data: { defaultCommissionRate: input.rate },
    select: { defaultCommissionRate: true },
  });
  return row.defaultCommissionRate;
}

export function parseDefaultCommissionRateFromForm(formData: FormData): number {
  return parseCommissionRateField(formData.get("defaultCommissionRate"));
}
