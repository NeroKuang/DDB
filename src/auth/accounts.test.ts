import { applyDotEnvFile } from "@/fetch/ichef-web-fetch";
import { prisma } from "@/lib/prisma";
import {
  adminResetPassword,
  changeOwnPassword,
  createAccount,
  seedAdminIfEmpty,
  verifyCredentials,
} from "@/auth/accounts";

applyDotEnvFile();

describe("accounts", () => {
  const prefix = `t_${Date.now()}_`;

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { username: { startsWith: prefix } },
    });
    await seedAdminIfEmpty();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany({
      where: { username: { startsWith: prefix } },
    });
  });

  it("seeds the first Admin from ADMIN_USERNAME and ADMIN_PASSWORD when none exists", async () => {
    await prisma.user.deleteMany({ where: { role: "ADMIN" } });
    const username = `${prefix}admin`;
    const result = await seedAdminIfEmpty({
      ADMIN_USERNAME: username,
      ADMIN_PASSWORD: "seed-pass-1",
    });
    expect(result).toEqual({ seeded: true, username });
    const user = await verifyCredentials(username, "seed-pass-1");
    expect(user?.role).toBe("ADMIN");
  });

  it("does not seed again when an Admin already exists", async () => {
    await prisma.user.deleteMany({ where: { role: "ADMIN" } });
    const username = `${prefix}admin2`;
    await seedAdminIfEmpty({
      ADMIN_USERNAME: username,
      ADMIN_PASSWORD: "seed-pass-1",
    });
    const second = await seedAdminIfEmpty({
      ADMIN_USERNAME: `${prefix}other`,
      ADMIN_PASSWORD: "seed-pass-2",
    });
    expect(second).toEqual({ seeded: false, username });
  });

  it("rejects wrong password", async () => {
    await prisma.user.deleteMany({ where: { role: "ADMIN" } });
    const username = `${prefix}admin3`;
    await seedAdminIfEmpty({
      ADMIN_USERNAME: username,
      ADMIN_PASSWORD: "seed-pass-1",
    });
    expect(await verifyCredentials(username, "nope")).toBeNull();
  });

  it("lets Admin create Supervisor and personal accounts", async () => {
    const supervisor = await createAccount({
      username: `${prefix}sup`,
      password: "sup-pass",
      role: "SUPERVISOR",
      actorRole: "ADMIN",
    });
    const personal = await createAccount({
      username: `${prefix}person`,
      password: "person-pass",
      role: "PERSONAL",
      actorRole: "ADMIN",
    });
    expect(supervisor.role).toBe("SUPERVISOR");
    expect(personal.role).toBe("PERSONAL");
    expect(await verifyCredentials(`${prefix}sup`, "sup-pass")).toBeTruthy();
  });

  it("forbids non-Admin from creating accounts", async () => {
    await expect(
      createAccount({
        username: `${prefix}x`,
        password: "x",
        role: "PERSONAL",
        actorRole: "SUPERVISOR",
      })
    ).rejects.toThrow(/Only Admin/);
  });

  it("lets a user change their own password", async () => {
    const created = await createAccount({
      username: `${prefix}self`,
      password: "old-pass",
      role: "PERSONAL",
      actorRole: "ADMIN",
    });
    await changeOwnPassword({
      userId: created.id,
      currentPassword: "old-pass",
      newPassword: "new-pass",
    });
    expect(await verifyCredentials(`${prefix}self`, "old-pass")).toBeNull();
    expect(await verifyCredentials(`${prefix}self`, "new-pass")).toBeTruthy();
  });

  it("lets Admin reset another account password without email", async () => {
    await createAccount({
      username: `${prefix}resetme`,
      password: "old-pass",
      role: "SUPERVISOR",
      actorRole: "ADMIN",
    });
    await adminResetPassword({
      actorRole: "ADMIN",
      username: `${prefix}resetme`,
      newPassword: "fresh-pass",
    });
    expect(
      await verifyCredentials(`${prefix}resetme`, "fresh-pass")
    ).toBeTruthy();
  });
});
