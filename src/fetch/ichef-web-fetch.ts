import { readFileSync } from "fs";
import type { Page } from "playwright";

export type IchefCredentials = {
  storeId: string;
  loginId: string;
  password: string;
};

export function applyDotEnvFile(filePath = ".env"): void {
  let text: string;
  try {
    text = readFileSync(filePath, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq < 1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function readIchefCredentialsFromEnv(
  env: NodeJS.Dict<string> = process.env
): IchefCredentials | null {
  const storeId = env.STORE_ID?.trim();
  const loginId = env.LOGIN_ID?.trim();
  const password = env.LOGIN_PASSWORD?.trim();
  if (!storeId || !loginId || !password) {
    return null;
  }
  return { storeId, loginId, password };
}

export class IchefFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IchefFetchError";
  }
}

export async function loginIchef(
  page: Page,
  creds: IchefCredentials
): Promise<void> {
  await page.goto("https://login.ichefpos.com/", {
    waitUntil: "networkidle",
  });
  await page.getByPlaceholder("Store ID").fill(creds.storeId);
  await page.getByPlaceholder("Login ID").fill(creds.loginId);
  await page.getByPlaceholder("Login Password").fill(creds.password);
  await page.getByRole("button", { name: "登入" }).click();
  const reportsNav = page.getByText("營業報表", { exact: true });
  try {
    await reportsNav.first().waitFor({ timeout: 25_000 });
  } catch {
    throw new IchefFetchError("iCHEF login did not reach 營業報表");
  }
  const dismiss = page.getByRole("button", { name: "我知道了" });
  try {
    await dismiss.click({ timeout: 5_000 });
  } catch {
    // no announcement modal
  }
}

export async function openBusinessReports(page: Page): Promise<void> {
  await page.getByText("營業報表", { exact: true }).first().click();
}
