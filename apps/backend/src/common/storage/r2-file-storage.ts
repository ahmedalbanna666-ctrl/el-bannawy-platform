import type { FileStorage, StoredFile } from "./file-storage";

export interface R2StorageOptions {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

interface S3Sdk {
  S3Client: new (config: Record<string, unknown>) => { send: (command: unknown) => Promise<unknown> };
  PutObjectCommand: new (input: Record<string, unknown>) => unknown;
  GetObjectCommand: new (input: Record<string, unknown>) => unknown;
  DeleteObjectCommand: new (input: Record<string, unknown>) => unknown;
  HeadObjectCommand: new (input: Record<string, unknown>) => unknown;
}

interface GetObjectOutput {
  Body?: {
    transformToByteArray?: () => Promise<Uint8Array>;
  };
}

// Optional dependency — only resolved at runtime when R2 is configured.
const S3_MODULE = "@aws-sdk/client-s3" as string;

async function loadS3Sdk(): Promise<S3Sdk> {
  const sdk = (await import(S3_MODULE)) as unknown as S3Sdk;
  return sdk;
}

/**
 * Optional Cloudflare R2 backend for the FileStorage abstraction.
 *
 * This implementation is NEVER instantiated unless the R2_* environment
 * variables are configured (see StorageModule). Local disk remains the
 * default backend, so no migration or URL change is performed by this class.
 */
export class R2FileStorage implements FileStorage {
  constructor(private readonly options: R2StorageOptions) {}

  private getEndpoint(): string {
    return `https://${this.options.accountId}.r2.cloudflarestorage.com`;
  }

  private toObjectKey(fileUrl: string): string {
    // Accept both "/files/<category>/<name>" (portable) and "<category>/<name>" /
    // "/<category>/<name>" (legacy R2-only keys).
    return fileUrl.replace(/^\/files\//, "").replace(/^\//, "");
  }

  private async loadClient(): Promise<InstanceType<S3Sdk["S3Client"]>> {
    const sdk = await loadS3Sdk();
    return new sdk.S3Client({
      region: "auto",
      endpoint: this.getEndpoint(),
      credentials: {
        accessKeyId: this.options.accessKeyId,
        secretAccessKey: this.options.secretAccessKey,
      },
    });
  }

  async save(buffer: Buffer, originalName: string, id: string, category = "documents"): Promise<StoredFile> {
    const sdk = await loadS3Sdk();
    const dot = originalName.lastIndexOf(".");
    const ext = dot >= 0 ? originalName.slice(dot).toLowerCase().slice(0, 12) : "";
    const safeId = id.replace(/[^a-zA-Z0-9-]/g, "");
    const storedName = `${safeId}${ext}`;
    const safeCategory = /^[a-z0-9-]+$/.test(category) ? category : "documents";
    const key = `${safeCategory}/${storedName}`;
    const client = await this.loadClient();
    await client.send(
      new sdk.PutObjectCommand({ Bucket: this.options.bucket, Key: key, Body: buffer }),
    );
    return { fileUrl: `/files/${safeCategory}/${storedName}`, storedName };
  }

  async read(fileUrl: string): Promise<Buffer> {
    const sdk = await loadS3Sdk();
    const client = await this.loadClient();
    const result = (await client.send(
      new sdk.GetObjectCommand({ Bucket: this.options.bucket, Key: this.toObjectKey(fileUrl) }),
    )) as GetObjectOutput;
    const bytes = await result.Body?.transformToByteArray?.();
    if (!bytes) {
      throw new Error("File not found in R2");
    }
    return Buffer.from(bytes);
  }

  async remove(fileUrl: string): Promise<void> {
    const sdk = await loadS3Sdk();
    const client = await this.loadClient();
    await client.send(
      new sdk.DeleteObjectCommand({ Bucket: this.options.bucket, Key: this.toObjectKey(fileUrl) }),
    );
  }

  async exists(fileUrl: string): Promise<boolean> {
    const sdk = await loadS3Sdk();
    const client = await this.loadClient();
    try {
      await client.send(
        new sdk.HeadObjectCommand({ Bucket: this.options.bucket, Key: this.toObjectKey(fileUrl) }),
      );
      return true;
    } catch {
      return false;
    }
  }

  resolve(fileUrl: string): string {
    return this.toObjectKey(fileUrl);
  }
}