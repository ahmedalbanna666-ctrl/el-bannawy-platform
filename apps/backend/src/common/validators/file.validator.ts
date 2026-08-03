import { BadRequestException } from "@nestjs/common";

const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const IMAGE_MAGIC_BYTES: Record<string, readonly number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
};

const PDF_MAGIC_BYTES: readonly number[] = [0x25, 0x50, 0x44, 0x46];

const FORBIDDEN_FILENAME_PATTERNS = /[<>:"/\\|?*\x00-\x1f]/g;
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".xlsx", ".jpg", ".jpeg", ".png", ".webp"];

export interface FileValidationOptions {
  readonly maxSize?: number;
  readonly allowedMimes?: readonly string[];
  readonly checkMagicBytes?: boolean;
}

export function validateUploadedFile(
  file: { originalname?: string; size?: number; buffer?: Buffer; mimetype?: string },
  options: FileValidationOptions = {},
): void {
  const buffer = file.buffer;
  if (!Buffer.isBuffer(buffer)) {
    throw new BadRequestException("File is required");
  }

  const maxSize = options.maxSize ?? MAX_DOCUMENT_SIZE;
  if (file.size && file.size > maxSize) {
    throw new BadRequestException(`File exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB`);
  }

  const allowedMimes = options.allowedMimes ?? ALLOWED_MIME_TYPES;
  const mimeType = file.mimetype ?? "";
  if (!allowedMimes.includes(mimeType)) {
    throw new BadRequestException(`File type "${mimeType}" is not allowed`);
  }

  const originalName = file.originalname ?? "";
  const ext = originalName.slice(originalName.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new BadRequestException(`File extension "${ext}" is not allowed`);
  }

  if (FORBIDDEN_FILENAME_PATTERNS.test(originalName)) {
    throw new BadRequestException("Filename contains invalid characters");
  }

  if (options.checkMagicBytes ?? true) {
    validateMagicBytes(buffer, mimeType, originalName);
  }
}

function validateMagicBytes(buffer: Buffer, mimeType: string, filename: string): void {
  if (IMAGE_MIME_TYPES.includes(mimeType)) {
    const expectedBytes = IMAGE_MAGIC_BYTES[mimeType];
    if (expectedBytes) {
      for (let i = 0; i < expectedBytes.length; i++) {
        if (buffer[i] !== expectedBytes[i]) {
          throw new BadRequestException(`File content does not match expected format for ${mimeType}`);
        }
      }
    }
  }

  if (mimeType === "application/pdf" || filename.endsWith(".pdf")) {
    for (let i = 0; i < PDF_MAGIC_BYTES.length; i++) {
      if (buffer[i] !== PDF_MAGIC_BYTES[i]) {
        throw new BadRequestException("File content does not match PDF format");
      }
    }
  }
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(FORBIDDEN_FILENAME_PATTERNS, "_").slice(0, 255);
}

export function decodeUploadedFilename(originalname: string): string {
  const decoded = Buffer.from(originalname, "latin1").toString("utf8");
  return decoded.includes("\uFFFD") ? originalname : decoded;
}

export const utf8FilenameInterceptorOptions = {
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ): void => {
    file.originalname = decodeUploadedFilename(file.originalname);
    cb(null, true);
  },
};

const KB_MAX_SIZE = 20 * 1024 * 1024;
const KB_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "application/json",
  "application/octet-stream",
];

const KB_ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md", ".markdown", ".json"];

export const knowledgeBaseInterceptorOptions = {
  limits: { fileSize: KB_MAX_SIZE },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ): void => {
    file.originalname = decodeUploadedFilename(file.originalname);
    const ext = file.originalname.slice(file.originalname.lastIndexOf(".")).toLowerCase();
    if (!KB_ALLOWED_EXTENSIONS.includes(ext)) {
      cb(new BadRequestException(`Knowledge-base file extension "${ext}" is not allowed`), false);
      return;
    }
    if (!KB_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new BadRequestException(`Knowledge-base file type "${file.mimetype}" is not allowed`), false);
      return;
    }
    cb(null, true);
  },
};
