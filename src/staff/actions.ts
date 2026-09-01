"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import {
  createStaff,
  openPersonalAccountForStaff,
  parseAliasesField,
  resetPersonalAccountPassword,
  updatePersonalAccountUsername,
  updateStaff,
  type StaffWriteInput,
} from "@/staff/manage";

export type StaffActionState = {
  ok: boolean;
  message: string;
};

function staffFromForm(formData: FormData): StaffWriteInput {
  return {
    legalName: String(formData.get("legalName") ?? ""),
    primaryNickname: String(formData.get("primaryNickname") ?? ""),
    contactPhone: String(formData.get("contactPhone") ?? ""),
    aliases: parseAliasesField(String(formData.get("aliases") ?? "")),
    title: String(formData.get("title") ?? ""),
    kind:
      String(formData.get("kind") ?? "regular") === "guest"
        ? "guest"
        : "regular",
    payKind:
      String(formData.get("payKind") ?? "hourly") === "monthly"
        ? "monthly"
        : "hourly",
    hourlyRate: Number(formData.get("hourlyRate") ?? 0),
    monthlyPay: Number(formData.get("monthlyPay") ?? 0),
    commissionRate: Number(formData.get("commissionRate") ?? 0.2),
    targetBonusAmount: Number(formData.get("targetBonusAmount") ?? 0),
    laborHealthInsuranceAmount: Number(
      formData.get("laborHealthInsuranceAmount") ?? 0
    ),
    payNote: String(formData.get("payNote") ?? ""),
  };
}

async function requireAdmin(): Promise<{ ok: true } | StaffActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以修改店員主檔。" };
  }
  return { ok: true };
}

export async function createStaffAction(
  _prev: StaffActionState,
  formData: FormData
): Promise<StaffActionState> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return gate;
  }
  try {
    await createStaff({
      actorRole: "ADMIN",
      storeId: String(formData.get("storeId") ?? "").trim(),
      data: staffFromForm(formData),
    });
    revalidatePath("/staff");
    revalidatePath("/payroll");
    revalidatePath("/performance");
    return { ok: true, message: "已新增店員。" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function updateStaffAction(
  _prev: StaffActionState,
  formData: FormData
): Promise<StaffActionState> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return gate;
  }
  try {
    const id = String(formData.get("id") ?? "").trim();
    await updateStaff({
      actorRole: "ADMIN",
      id,
      data: staffFromForm(formData),
    });
    revalidatePath("/staff");
    revalidatePath(`/staff/${id}`);
    revalidatePath("/payroll");
    revalidatePath("/performance");
    return { ok: true, message: "已儲存店員主檔。" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function openPersonalAccountAction(
  _prev: StaffActionState,
  formData: FormData
): Promise<StaffActionState> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return gate;
  }
  try {
    const staffId = String(formData.get("staffId") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim();
    const account = await openPersonalAccountForStaff({
      actorRole: "ADMIN",
      staffId,
      username: username || undefined,
    });
    revalidatePath("/staff");
    revalidatePath(`/staff/${staffId}`);
    return {
      ok: true,
      message: `已開 personal 帳號：${account.username}（初始密碼為聯絡電話後四碼）。`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function resetPersonalPasswordAction(
  _prev: StaffActionState,
  formData: FormData
): Promise<StaffActionState> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return gate;
  }
  try {
    const staffId = String(formData.get("staffId") ?? "").trim();
    await resetPersonalAccountPassword({ actorRole: "ADMIN", staffId });
    revalidatePath("/staff");
    revalidatePath(`/staff/${staffId}`);
    return {
      ok: true,
      message: "已重設密碼為聯絡電話後四碼。",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function updatePersonalUsernameAction(
  _prev: StaffActionState,
  formData: FormData
): Promise<StaffActionState> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return gate;
  }
  try {
    const staffId = String(formData.get("staffId") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim();
    const account = await updatePersonalAccountUsername({
      actorRole: "ADMIN",
      staffId,
      username,
    });
    revalidatePath("/staff");
    revalidatePath(`/staff/${staffId}`);
    return { ok: true, message: `登入名稱已改為 ${account.username}。` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
