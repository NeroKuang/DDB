import { createHash } from "crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { readdirSync, readFileSync } from "fs";
import path from "path";

export type MinioConfig = {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
};

export function readMinioConfigFromEnv(
  env: NodeJS.Dict<string> = process.env
): MinioConfig | null {
  const endpoint = env.MINIO_ENDPOINT?.trim();
  const accessKey = env.MINIO_ACCESS_KEY?.trim();
  const secretKey = env.MINIO_SECRET_KEY?.trim();
  const bucket = env.MINIO_BUCKET?.trim() || "ddb";
  if (!endpoint || !accessKey || !secretKey) {
    return null;
  }
  return { endpoint, accessKey, secretKey, bucket };
}

function createClient(config: MinioConfig): S3Client {
  const url = new URL(config.endpoint);
  return new S3Client({
    endpoint: config.endpoint,
    region: "us-east-1",
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    forcePathStyle: true,
    tls: url.protocol === "https:",
  });
}

/** Upload every file under localDir to MinIO as evidence (no-op if env missing). */
export async function uploadDirectoryToMinioEvidence(
  localDir: string,
  objectPrefix: string,
  env: NodeJS.Dict<string> = process.env
): Promise<{ uploaded: number; skipped: boolean }> {
  const config = readMinioConfigFromEnv(env);
  if (!config) {
    return { uploaded: 0, skipped: true };
  }
  const client = createClient(config);
  const files = readdirSync(localDir, { withFileTypes: true }).filter((entry) =>
    entry.isFile()
  );
  let uploaded = 0;
  for (const entry of files) {
    const filePath = path.join(localDir, entry.name);
    const key = `${objectPrefix.replace(/\/$/, "")}/${entry.name}`;
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: readFileSync(filePath),
        ContentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
    );
    uploaded += 1;
  }
  return { uploaded, skipped: false };
}

export function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Upload one buffer to MinIO (no-op if env missing). */
export async function uploadBufferToMinio(
  key: string,
  bytes: Buffer,
  env: NodeJS.Dict<string> = process.env,
  contentType = XLSX_CONTENT_TYPE
): Promise<{ skipped: boolean }> {
  const config = readMinioConfigFromEnv(env);
  if (!config) {
    return { skipped: true };
  }
  const client = createClient(config);
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: bytes,
      ContentType: contentType,
    })
  );
  return { skipped: false };
}
