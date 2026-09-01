import { describe, expect, it, vi } from "vitest";

vi.mock("@/import/minio-object-store", () => ({
  isMinioConfigured: vi.fn(() => false),
  getMinioObjectBuffer: vi.fn(),
  deleteMinioObject: vi.fn(),
}));

import { runStorageRetentionCron } from "@/storage-retention/run-retention";

describe("runStorageRetentionCron", () => {
  it("returns early when MinIO is not configured", async () => {
    const result = await runStorageRetentionCron(new Date("2026-09-01"));
    expect(result.minioConfigured).toBe(false);
    expect(result.archived).toEqual([]);
    expect(result.purged).toEqual([]);
  });
});
