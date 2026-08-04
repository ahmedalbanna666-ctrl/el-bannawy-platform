import * as fs from "fs/promises";
import * as path from "path";
import { Injectable } from "@nestjs/common";
import type { FileStorage, StoredFile } from "./file-storage";

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");

function categoryOf(fileUrl: string): string {
  // /files/<category>/<name>
  const match = /^\/files\/([^/]+)\/(.+)$/.exec(fileUrl);
  if (match) return match[1];
  return "documents";
}

@Injectable()
export class LocalFileStorage implements FileStorage {
  async save(buffer: Buffer, originalName: string, id: string, category = "documents"): Promise<StoredFile> {
    const safeCategory = /^[a-z0-9-]+$/.test(category) ? category : "documents";
    const uploadDir = path.join(UPLOAD_ROOT, safeCategory);
    await fs.mkdir(uploadDir, { recursive: true });
    const ext = path.extname(originalName).toLowerCase().slice(0, 12);
    const safeId = id.replace(/[^a-zA-Z0-9-]/g, "");
    const storedName = `${safeId}${ext}`;
    const target = path.join(uploadDir, storedName);
    await fs.writeFile(target, buffer);
    return { fileUrl: `/files/${safeCategory}/${storedName}`, storedName };
  }

  async read(fileUrl: string): Promise<Buffer> {
    const target = await this.findOnDisk(fileUrl);
    if (!target) throw new Error("File not found");
    return fs.readFile(target);
  }

  async remove(fileUrl: string): Promise<void> {
    if (!fileUrl.startsWith("/files/")) return;
    const target = await this.findOnDisk(fileUrl);
    if (!target) return;
    try {
      await fs.unlink(target);
    } catch {
      // ignore missing file
    }
  }

  resolve(fileUrl: string): string {
    const category = categoryOf(fileUrl);
    // The remainder after the category may itself contain "/" (legacy
    // multi-segment URLs such as /files/certificates/{userId}/{name}).
    const rest = fileUrl.replace(/^\/files\/[^/]+\//, "");
    return path.join(UPLOAD_ROOT, category, rest);
  }

  async findOnDisk(fileUrl: string): Promise<string | null> {
    const candidate = this.resolve(fileUrl);
    if (await fs.access(candidate, fs.constants.F_OK).then(() => true, () => false)) {
      return candidate;
    }
    // Legacy flat layout: /files/<category>/<name> stored as <name> only.
    const flat = path.join(UPLOAD_ROOT, categoryOf(fileUrl), path.basename(fileUrl));
    if (flat !== candidate && (await fs.access(flat, fs.constants.F_OK).then(() => true, () => false))) {
      return flat;
    }
    return null;
  }

  exists(fileUrl: string): Promise<boolean> {
    return this.findOnDisk(fileUrl).then((target) => target !== null);
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
