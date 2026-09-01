import type { AccountRole, WebFetchStatus } from "@prisma/client";
import {
  fetchIchefBusinessReports,
  readIchefCredentialsFromEnv,
  type FetchedIchefFiles,
  type IchefCredentials,
} from "@/fetch/ichef-web-fetch";
import { runIngestPipeline } from "@/import/ingest/run-ingest-pipeline";
import { prisma } from "@/lib/prisma";
import { ensurePayPeriodRow } from "@/pay-period/ensure-period-row";
import { assertJulyPayPeriodUnlocked } from "@/pay-period/guards";
import { ZHONGSHAN_STORE_CODE } from "@/staff/seed-zhongshan";
import { fileRangeForPeriodKey } from "@/web-fetch/period-file-range";

export type WebFetchProgress = {
  periodKey: string;
  status: WebFetchStatus;
  startedAt: Date | null;
  finishedAt: Date | null;
  errorMessage: string | null;
  rangeStart: string | null;
  rangeEnd: string | null;
};

export type WebFetchRunner = (
  creds: IchefCredentials,
  range: { startDate: string; endDate: string }
) => Promise<FetchedIchefFiles>;

let webFetchRunner: WebFetchRunner = fetchIchefBusinessReports;

export function setWebFetchRunnerForTests(runner: WebFetchRunner | null): void {
  webFetchRunner = runner ?? fetchIchefBusinessReports;
}

function fetchedToUploadInputs(fetched: FetchedIchefFiles) {
  return [
    fetched.checkout,
    fetched.punches,
    fetched.noteOuter,
    ...fetched.noteDrilldowns.map((item) => item.file),
  ];
}

function requireAdmin(actorRole: AccountRole): void {
  if (actorRole !== "ADMIN") {
    throw new Error("Only Admin can start 網頁取數");
  }
}

function mapProgress(row: {
  periodKey: string;
  fetchStatus: WebFetchStatus;
  fetchStartedAt: Date | null;
  fetchFinishedAt: Date | null;
  fetchErrorMessage: string | null;
  fetchRangeStart: string | null;
  fetchRangeEnd: string | null;
}): WebFetchProgress {
  return {
    periodKey: row.periodKey,
    status: row.fetchStatus,
    startedAt: row.fetchStartedAt,
    finishedAt: row.fetchFinishedAt,
    errorMessage: row.fetchErrorMessage,
    rangeStart: row.fetchRangeStart,
    rangeEnd: row.fetchRangeEnd,
  };
}

export async function getWebFetchProgress(
  storeId: string,
  periodKey: string
): Promise<WebFetchProgress> {
  const row = await prisma.payPeriod.findUnique({
    where: { storeId_periodKey: { storeId, periodKey } },
  });
  if (!row) {
    return {
      periodKey,
      status: "IDLE",
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      rangeStart: null,
      rangeEnd: null,
    };
  }
  return mapProgress(row);
}

async function assertNoStoreFetchRunning(
  storeId: string,
  exceptPeriodId?: string
): Promise<void> {
  const running = await prisma.payPeriod.findFirst({
    where: {
      storeId,
      fetchStatus: "RUNNING",
      ...(exceptPeriodId ? { id: { not: exceptPeriodId } } : {}),
    },
  });
  if (running) {
    throw new Error("已有取數進行中，請待完成後再試");
  }
}

export async function startWebFetch(input: {
  actorRole: AccountRole;
  storeId: string;
  periodKey: string;
}): Promise<WebFetchProgress> {
  requireAdmin(input.actorRole);
  await assertJulyPayPeriodUnlocked(input.storeId);
  const creds = readIchefCredentialsFromEnv();
  if (!creds) {
    throw new Error("iCHEF 憑證未設定（STORE_ID／LOGIN_ID／LOGIN_PASSWORD）");
  }
  const range = fileRangeForPeriodKey(input.periodKey);
  const row = await ensurePayPeriodRow(input.storeId, input.periodKey);
  await assertNoStoreFetchRunning(input.storeId, row.id);

  const current = await prisma.payPeriod.findUnique({ where: { id: row.id } });
  if (current?.fetchStatus === "RUNNING") {
    throw new Error("本期取數進行中");
  }

  const startedAt = new Date();
  const updated = await prisma.payPeriod.update({
    where: { id: row.id },
    data: {
      fetchStatus: "RUNNING",
      fetchStartedAt: startedAt,
      fetchFinishedAt: null,
      fetchErrorMessage: null,
      fetchRangeStart: range.startDate,
      fetchRangeEnd: range.endDate,
    },
  });
  return mapProgress(updated);
}

export async function runWebFetchJob(periodId: string): Promise<void> {
  const row = await prisma.payPeriod.findUnique({ where: { id: periodId } });
  if (!row || row.fetchStatus !== "RUNNING") {
    return;
  }
  const creds = readIchefCredentialsFromEnv();
  if (!creds) {
    await prisma.payPeriod.update({
      where: { id: periodId },
      data: {
        fetchStatus: "FAILED",
        fetchFinishedAt: new Date(),
        fetchErrorMessage: "iCHEF 憑證未設定",
      },
    });
    return;
  }
  const range = {
    startDate: row.fetchRangeStart ?? "",
    endDate: row.fetchRangeEnd ?? "",
  };
  if (!range.startDate || !range.endDate) {
    await prisma.payPeriod.update({
      where: { id: periodId },
      data: {
        fetchStatus: "FAILED",
        fetchFinishedAt: new Date(),
        fetchErrorMessage: "取數日期區間缺失",
      },
    });
    return;
  }
  try {
    const fetched = await webFetchRunner(creds, range);
    const store = await prisma.store.findUniqueOrThrow({
      where: { id: row.storeId },
      select: { code: true },
    });
    await runIngestPipeline({
      payPeriodId: row.id,
      storeId: row.storeId,
      storeCode: store.code || ZHONGSHAN_STORE_CODE,
      periodKey: row.periodKey,
      source: "WEB_FETCH",
      files: fetchedToUploadInputs(fetched),
      fileRange: range,
    });
    await prisma.payPeriod.update({
      where: { id: periodId },
      data: {
        fetchStatus: "SUCCEEDED",
        fetchFinishedAt: new Date(),
        fetchErrorMessage: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "網頁取數失敗";
    await prisma.payPeriod.update({
      where: { id: periodId },
      data: {
        fetchStatus: "FAILED",
        fetchFinishedAt: new Date(),
        fetchErrorMessage: message.slice(0, 2000),
      },
    });
  }
}

export async function startWebFetchAndQueueJob(input: {
  actorRole: AccountRole;
  storeId: string;
  periodKey: string;
}): Promise<{ progress: WebFetchProgress; periodId: string }> {
  const progress = await startWebFetch(input);
  const row = await prisma.payPeriod.findUnique({
    where: {
      storeId_periodKey: {
        storeId: input.storeId,
        periodKey: input.periodKey,
      },
    },
  });
  if (!row) {
    throw new Error("PayPeriod missing after start");
  }
  return { progress, periodId: row.id };
}
