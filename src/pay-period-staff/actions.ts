"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { periodKeyFromFormData } from "@/lib/resolve-period-key";
import { authOptions } from "@/lib/auth-options";
import type { Venue } from "@/compile/types";
import { upsertPeriodStaffSetting } from "@/pay-period-staff/manage";
import type { PeriodStaffSettingsJson } from "@/pay-period-staff/types";

export type PeriodStaffActionState = {
  ok: boolean;
  message: string;
};

function venueFromForm(value: string): Venue {
  return value === "backOfHouse" ? "backOfHouse" : "frontOfHouse";
}

function parseSettingsFromForm(formData: FormData): PeriodStaffSettingsJson {
  const addBackOfHouseRow = formData.get("addBackOfHouseRow") === "on";
  const payTargetBonus = formData.get("payTargetBonus") === "on";
  const frontSales = Number(formData.get("venueSalesFront") ?? 0);
  const backSales = Number(formData.get("venueSalesBack") ?? 0);
  const frontHours = Number(formData.get("hoursFront") ?? 0);
  const backHours = Number(formData.get("hoursBack") ?? 0);
  const settings: PeriodStaffSettingsJson = {
    addBackOfHouseRow,
    landInsuranceOn: venueFromForm(
      String(formData.get("landInsuranceOn") ?? "frontOfHouse")
    ),
    landTargetOn: venueFromForm(
      String(formData.get("landTargetOn") ?? "frontOfHouse")
    ),
    landMonthlyOn: venueFromForm(
      String(formData.get("landMonthlyOn") ?? "frontOfHouse")
    ),
    landTaskBonusOn: venueFromForm(
      String(formData.get("landTaskBonusOn") ?? "frontOfHouse")
    ),
    payTargetBonus,
    perRow: {},
  };
  if (addBackOfHouseRow && (frontSales > 0 || backSales > 0)) {
    settings.venueSalesSplit = {
      frontOfHouse: frontSales,
      backOfHouse: backSales,
    };
  }
  if (addBackOfHouseRow && (frontHours > 0 || backHours > 0)) {
    settings.hoursSplit = { frontOfHouse: frontHours, backOfHouse: backHours };
  }
  const frontManuals = {
    demerits: Number(formData.get("frontDemerits") ?? 0),
    overtimeWithHoliday: Number(formData.get("frontOtHoliday") ?? 0),
    overtimeWithoutHoliday: Number(formData.get("frontOtWeekday") ?? 0),
    allowance: Number(formData.get("frontAllowance") ?? 0),
    allowanceNote: String(formData.get("frontAllowanceNote") ?? ""),
    repayment: Number(formData.get("frontRepayment") ?? 0),
    photoCommission: Number(formData.get("frontPhotoCommission") ?? 0),
  };
  const backManuals = {
    demerits: Number(formData.get("backDemerits") ?? 0),
    overtimeWithHoliday: Number(formData.get("backOtHoliday") ?? 0),
    overtimeWithoutHoliday: Number(formData.get("backOtWeekday") ?? 0),
    allowance: Number(formData.get("backAllowance") ?? 0),
    allowanceNote: String(formData.get("backAllowanceNote") ?? ""),
    repayment: Number(formData.get("backRepayment") ?? 0),
    photoCommission: Number(formData.get("backPhotoCommission") ?? 0),
  };
  const hasFrontManual = Object.entries(frontManuals).some(([key, value]) =>
    key === "allowanceNote" ? value !== "" : Number(value) !== 0
  );
  const hasBackManual = Object.entries(backManuals).some(([key, value]) =>
    key === "allowanceNote" ? value !== "" : Number(value) !== 0
  );
  if (hasFrontManual) {
    settings.perRow.frontOfHouse = frontManuals;
  }
  if (hasBackManual) {
    settings.perRow.backOfHouse = backManuals;
  }
  const laborModeRaw = String(formData.get("laborHealthInsuranceMode") ?? "");
  if (laborModeRaw === "fixed" || laborModeRaw === "ratio") {
    settings.laborHealthInsuranceMode = laborModeRaw;
    settings.laborHealthInsuranceAmount = Number(
      formData.get("laborHealthInsuranceAmount") ?? 0
    );
    settings.laborHealthInsuranceRatio = Number(
      formData.get("laborHealthInsuranceRatio") ?? 0
    );
  }
  return settings;
}

export async function savePeriodStaffAction(
  _prev: PeriodStaffActionState,
  formData: FormData
): Promise<PeriodStaffActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以修改本期店員設定。" };
  }
  try {
    const storeId = String(formData.get("storeId") ?? "").trim();
    const staffId = String(formData.get("staffId") ?? "").trim();
    const periodKey = periodKeyFromFormData(formData);
    await upsertPeriodStaffSetting({
      actorRole: "ADMIN",
      storeId,
      periodKey,
      staffId,
      settings: parseSettingsFromForm(formData),
    });
    revalidatePath("/period-staff");
    revalidatePath("/payroll");
    revalidatePath("/performance");
    return { ok: true, message: "已儲存本期店員設定。" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
