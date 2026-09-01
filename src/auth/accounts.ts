import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { AccountRole, User } from "@prisma/client";

const BCRYPT_ROUNDS = 10;

export type PublicUser = {
  id: string;
  username: string;
  role: AccountRole;
  staffId: string | null;
  primaryNickname: string | null;
};

function toPublic(
  user: User & { staff?: { primaryNickname: string } | null }
): PublicUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    staffId: user.staffId,
    primaryNickname: user.staff?.primaryNickname ?? null,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyCredentials(
  username: string,
  password: string
): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    include: { staff: true },
  });
  if (!user) {
    return null;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? toPublic(user) : null;
}

export async function seedAdminIfEmpty(
  env: NodeJS.Dict<string> = process.env
): Promise<{
  seeded: boolean;
  username: string | null;
}> {
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });
  if (existingAdmin) {
    return { seeded: false, username: existingAdmin.username };
  }
  const username = env.ADMIN_USERNAME?.trim();
  const password = env.ADMIN_PASSWORD;
  if (!username || !password) {
    throw new Error(
      "ADMIN_USERNAME and ADMIN_PASSWORD are required to seed the first Admin"
    );
  }
  await prisma.user.create({
    data: {
      username,
      passwordHash: await hashPassword(password),
      role: "ADMIN",
    },
  });
  return { seeded: true, username };
}

export async function createAccount(input: {
  username: string;
  password: string;
  role: Exclude<AccountRole, "ADMIN">;
  actorRole: AccountRole;
  staffId?: string;
}): Promise<PublicUser> {
  if (input.actorRole !== "ADMIN") {
    throw new Error("Only Admin can create accounts");
  }
  const username = input.username.trim();
  if (!username || !input.password) {
    throw new Error("username and password are required");
  }
  if (input.role === "PERSONAL") {
    if (!input.staffId) {
      throw new Error("personal accounts require a 店員");
    }
    const staff = await prisma.staff.findUnique({
      where: { id: input.staffId },
    });
    if (!staff) {
      throw new Error("店員 not found");
    }
    if (staff.kind === "GUEST") {
      throw new Error("客座 cannot have DDB accounts");
    }
    const existingPersonal = await prisma.user.findFirst({
      where: { staffId: input.staffId, role: "PERSONAL" },
    });
    if (existingPersonal) {
      throw new Error("此店員已有 personal 帳號");
    }
  }
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      staffId: input.role === "PERSONAL" ? input.staffId : null,
    },
    include: { staff: true },
  });
  return toPublic(user);
}

export async function changeOwnPassword(input: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) {
    throw new Error("account not found");
  }
  const ok = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!ok) {
    throw new Error("current password is wrong");
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(input.newPassword) },
  });
}

export async function adminResetPassword(input: {
  actorRole: AccountRole;
  username: string;
  newPassword: string;
}): Promise<void> {
  if (input.actorRole !== "ADMIN") {
    throw new Error("Only Admin can reset passwords");
  }
  const user = await prisma.user.findUnique({
    where: { username: input.username },
  });
  if (!user) {
    throw new Error("account not found");
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(input.newPassword) },
  });
}
