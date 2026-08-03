import { InternalServerErrorException } from "@nestjs/common";

export const FILE_STORAGE = Symbol("FILE_STORAGE");

export interface StoredFile {
  fileUrl: string;
  storedName: string;
}

/**
 * Abstraction over the platform's file storage backends.
 *
 * The default implementation is the local disk (`LocalFileStorage`).
 * Cloudflare R2 (`R2FileStorage`) is optional and only activated when the
 * `R2_*` environment variables are present. Existing endpoints remain
 * compatible because every backend exposes the same buffer-based API and the
 * stored `fileUrl` values keep their existing shape.
 */
export interface FileStorage {
  save(buffer: Buffer, originalName: string, id: string): Promise<StoredFile>;
  read(fileUrl: string): Promise<Buffer>;
  remove(fileUrl: string): Promise<void>;
  exists(fileUrl: string): Promise<boolean>;
  resolve(fileUrl: string): string;
}

export class FileStorageError extends InternalServerErrorException {}
