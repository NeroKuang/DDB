import { describe, expect, it } from "vitest";
import { buildTarGz, extractTarGz } from "@/storage-retention/tar-gzip";

describe("tar-gzip", () => {
  it("round-trips file entries", async () => {
    const archive = buildTarGz([
      { name: "結帳_test.xlsx", bytes: Buffer.from("hello") },
      { name: "打卡_test.xlsx", bytes: Buffer.from("world") },
    ]);
    const files = await extractTarGz(archive);
    expect(files).toHaveLength(2);
    expect(files[0]?.name).toBe("結帳_test.xlsx");
    expect(files[0]?.bytes.toString()).toBe("hello");
    expect(files[1]?.name).toBe("打卡_test.xlsx");
    expect(files[1]?.bytes.toString()).toBe("world");
  });
});
