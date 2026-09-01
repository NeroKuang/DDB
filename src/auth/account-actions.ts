"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import {
  adminResetPassword,
  changeOwnPassword,
  createAccount,
} from "@/auth/accounts";
import { authOptions } from "@/lib/auth-options";

export type AccountActionState = { ok: boolean; message: string };

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }
  return session;
}

export async function createSupervisorAction(
  _prev: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const session = await requireSession();
  if (!session || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以建立 Supervisor。" };
  }
  try {
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const account = await createAccount({
      actorRole: "ADMIN",
      username,
      password,
      role: "SUPERVISOR",
    });
    revalidatePath("/accounts");
    return { ok: true, message: `已建立 Supervisor：${account.username}` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function adminResetPasswordAction(
  _prev: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const session = await requireSession();
  if (!session || session.user.role !== "ADMIN") {
    return { ok: false, message: "只有 Admin 可以重設密碼。" };
  }
  try {
    const username = String(formData.get("username") ?? "").trim();
    const newPassword = String(formData.get("newPassword") ?? "");
    await adminResetPassword({
      actorRole: "ADMIN",
      username,
      newPassword,
    });
    revalidatePath("/accounts");
    return { ok: true, message: `已重設 ${username} 的密碼。` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function changeOwnPasswordAction(
  _prev: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const session = await requireSession();
  if (!session) {
    return { ok: false, message: "請先登入。" };
  }
  try {
    await changeOwnPassword({
      userId: session.user.id,
      currentPassword: String(formData.get("currentPassword") ?? ""),
      newPassword: String(formData.get("newPassword") ?? ""),
    });
    return { ok: true, message: "密碼已更新。" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
