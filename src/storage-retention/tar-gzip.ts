import { gzipSync } from "node:zlib";

function writeOctalField(
  header: Buffer,
  offset: number,
  length: number,
  value: number
): void {
  const text = value.toString(8).padStart(length - 1, "0") + "\0";
  header.write(text, offset, length, "ascii");
}

function createTarHeader(name: string, size: number): Buffer {
  const header = Buffer.alloc(512, 0);
  header.write(name.slice(0, 100), 0, 100, "utf8");
  writeOctalField(header, 100, 8, 0o644);
  writeOctalField(header, 108, 8, 0);
  writeOctalField(header, 116, 8, 0);
  writeOctalField(header, 124, 12, size);
  writeOctalField(header, 136, 12, Math.floor(Date.now() / 1000));
  header.write("        ", 148, 8, "ascii");
  header[156] = "0".charCodeAt(0);
  header.write("ustar", 257, 5, "ascii");
  header.write("00", 263, 2, "ascii");

  let checksum = 0;
  for (let i = 0; i < 512; i += 1) {
    checksum += header[i];
  }
  writeOctalField(header, 148, 8, checksum);
  return header;
}

/** Build a gzip-compressed ustar tar archive (no external deps). */
export function buildTarGz(files: { name: string; bytes: Buffer }[]): Buffer {
  const chunks: Buffer[] = [];
  for (const file of files) {
    chunks.push(createTarHeader(file.name, file.bytes.length));
    chunks.push(file.bytes);
    const padding = (512 - (file.bytes.length % 512)) % 512;
    if (padding > 0) {
      chunks.push(Buffer.alloc(padding));
    }
  }
  chunks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(chunks));
}

export async function extractTarGz(
  archive: Buffer
): Promise<{ name: string; bytes: Buffer }[]> {
  const { gunzipSync } = await import("node:zlib");
  const tar = gunzipSync(archive);
  const files: { name: string; bytes: Buffer }[] = [];
  let offset = 0;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    offset += 512;
    if (header.every((byte) => byte === 0)) {
      break;
    }
    const name = header.toString("utf8", 0, 100).replace(/\0+$/, "");
    const sizeOctal = header.toString("utf8", 124, 136).replace(/\0+$/, "");
    const size = Number.parseInt(sizeOctal, 8);
    if (!name || !Number.isFinite(size)) {
      break;
    }
    const bytes = tar.subarray(offset, offset + size);
    offset += size;
    const padding = (512 - (size % 512)) % 512;
    offset += padding;
    files.push({ name, bytes: Buffer.from(bytes) });
  }
  return files;
}
