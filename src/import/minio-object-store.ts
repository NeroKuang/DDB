import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import {
  createMinioClient,
  readMinioConfigFromEnv,
  type MinioConfig,
} from "@/import/minio-evidence";

async function streamToBuffer(body: unknown): Promise<Buffer> {
  if (!body) {
    throw new Error("MinIO object body is empty");
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function requireConfig(env: NodeJS.Dict<string> = process.env): MinioConfig {
  const config = readMinioConfigFromEnv(env);
  if (!config) {
    throw new Error("MinIO 未設定（MINIO_ENDPOINT／ACCESS_KEY／SECRET_KEY）");
  }
  return config;
}

export async function getMinioObjectBuffer(
  key: string,
  env: NodeJS.Dict<string> = process.env
): Promise<Buffer> {
  const config = requireConfig(env);
  const client = createMinioClient(config);
  const response = await client.send(
    new GetObjectCommand({ Bucket: config.bucket, Key: key })
  );
  return streamToBuffer(response.Body);
}

export async function deleteMinioObject(
  key: string,
  env: NodeJS.Dict<string> = process.env
): Promise<void> {
  const config = requireConfig(env);
  const client = createMinioClient(config);
  await client.send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: key })
  );
}

export async function listMinioObjectKeys(
  prefix: string,
  env: NodeJS.Dict<string> = process.env
): Promise<string[]> {
  const config = requireConfig(env);
  const client = createMinioClient(config);
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: prefix.replace(/\/$/, "") + "/",
        ContinuationToken: token,
      })
    );
    for (const item of page.Contents ?? []) {
      if (item.Key) {
        keys.push(item.Key);
      }
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

export function isMinioConfigured(
  env: NodeJS.Dict<string> = process.env
): boolean {
  return readMinioConfigFromEnv(env) != null;
}
