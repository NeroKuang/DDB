import { describe, expect, it } from "vitest";
import { readMinioConfigFromEnv } from "@/import/minio-evidence";

describe("minio-evidence", () => {
  it("returns null when MinIO env is incomplete", () => {
    expect(
      readMinioConfigFromEnv({
        MINIO_ENDPOINT: "http://127.0.0.1:9000",
      })
    ).toBeNull();
  });

  it("parses config when all vars present", () => {
    const config = readMinioConfigFromEnv({
      MINIO_ENDPOINT: "http://127.0.0.1:9000",
      MINIO_ACCESS_KEY: "key",
      MINIO_SECRET_KEY: "secret",
      MINIO_BUCKET: "ddb",
    });
    expect(config?.bucket).toBe("ddb");
  });
});
