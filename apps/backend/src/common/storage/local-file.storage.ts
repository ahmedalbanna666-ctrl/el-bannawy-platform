import * as fs from "fs/promises";
import * as path from "path";
import { Injectable } from "@nestjs/common";
import type { FileStorage, StoredFile } from "./file-storage";

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads", "documents");

@Injectable()
export class LocalFileStorage implements FileStorage {
  async save(buffer: Buffer, originalName: string, id: string): Promise<StoredFile> {
    await fs.mkdir(UPLOAD_ROOT, { recursive: true });
    const ext = path.extname(originalName).toLowerCase().slice(0, 12);
    const safeId = id.replace(/[^a-zA-Z0-9-]/g, "");
    const storedName = `${safeId}${ext}`;
    const target = path.join(UPLOAD_ROOT, storedName);
    await fs.writeFile(target, buffer);
    return { fileUrl: `/files/documents/${storedName}`, storedName };
  }

  async read(fileUrl: string): Promise<Buffer> {
    return fs.readFile(this.resolve(fileUrl));
  }

  async remove(fileUrl: string): Promise<void> {
    if (!fileUrl.startsWith("/files/documents/")) return;
    const storedName = path.basename(fileUrl);
    const target = path.join(UPLOAD_ROOT, storedName);
    try {
      await fs.unlink(target);
    } catch {
      // ignore missing file
    }
  }

  resolve(fileUrl: string): string {
    const storedName = path.basename(fileUrl);
    return path.join(UPLOAD_ROOT, storedName);
  }

  exists(fileUrl: string): Promise<boolean> {
    return fs.access(this.resolve(fileUrl), fs.constants.F_OK).then(
      () => true,
      () => false,
    );
  }
}

export function resolveMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
  };
  return map[ext] ?? "application/octet-stream";
}
