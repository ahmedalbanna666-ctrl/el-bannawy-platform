import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import * as fs from "fs/promises";
import * as path from "path";
import { Prisma } from "@prisma/client";
import { AiKnowledgeBaseRepository } from "./ai-knowledge-base.repository";
import { ChunkingService } from "./rag/chunking.service";
import { EmbeddingService } from "./rag/embedding.service";
import { SearchService, type SearchResult } from "./rag/search.service";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../common/services/cache.service";
import { assertSafeExternalUrl } from "../common/utils/ssrf-guard";
import { CreateKnowledgeSourceDto, UpdateKnowledgeSourceDto } from "./dto/create-knowledge-source.dto";

function normalizeRagQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, " ").slice(0, 100);
}

@Injectable()
export class AiKnowledgeBaseService {
  constructor(
    private readonly repository: AiKnowledgeBaseRepository,
    private readonly chunking: ChunkingService,
    private readonly embedding: EmbeddingService,
    private readonly search: SearchService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async createSource(dto: CreateKnowledgeSourceDto, file?: Express.Multer.File) {
    const data: Record<string, unknown> = {
      title: dto.title,
      description: dto.description ?? null,
      type: dto.type ?? "PDF",
      url: dto.url ?? null,
      gradeId: dto.gradeId ?? null,
      termId: dto.termId ?? null,
      subject: dto.subject ?? "english",
      tags: dto.tags ? JSON.stringify(dto.tags) : null,
      isEnabled: dto.isEnabled ?? true,
      status: "PENDING",
    };

    if (file) {
      const storedPath = await this.persistUpload(file);
      if (storedPath) {
        data.filePath = storedPath;
      }
      data.fileSize = file.size;
      data.fileType = file.mimetype;
    }

    const created = await this.repository.createSource(data);
    await this.invalidateRagCache();
    return created;
  }

  private async persistUpload(file: Express.Multer.File): Promise<string | null> {
    const buffer = file.buffer;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      return null;
    }
    try {
      const uploadDir = path.resolve(process.cwd(), "uploads", "ai-knowledge");
      await fs.mkdir(uploadDir, { recursive: true });
      const ext = path.extname(file.originalname).toLowerCase().slice(0, 12);
      const storedName = `${String(Date.now())}-${randomBytes(6).toString("hex")}${ext}`;
      const target = path.join(uploadDir, storedName);
      await fs.writeFile(target, buffer);
      return target;
    } catch (error) {
      Logger.warn(`Failed to persist knowledge-base upload: ${error instanceof Error ? error.message : String(error)}`, "AiKnowledgeBaseService");
      return null;
    }
  }

  async updateSource(id: string, dto: UpdateKnowledgeSourceDto) {
    const existing = await this.repository.getSource(id);
    if (!existing) throw new NotFoundException("Knowledge source not found");

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.url !== undefined) data.url = dto.url;
    if (dto.gradeId !== undefined) data.gradeId = dto.gradeId;
    if (dto.termId !== undefined) data.termId = dto.termId;
    if (dto.subject !== undefined) data.subject = dto.subject;
    if (dto.tags !== undefined) data.tags = JSON.stringify(dto.tags);
    if (dto.isEnabled !== undefined) data.isEnabled = dto.isEnabled;

    const updated = await this.repository.updateSource(id, data);
    await this.invalidateRagCache();
    return updated;
  }

  async setSourceEnabled(id: string, isEnabled: boolean) {
    const existing = await this.repository.getSource(id);
    if (!existing) throw new NotFoundException("Knowledge source not found");
    const updated = await this.repository.updateSource(id, { isEnabled });
    await this.invalidateRagCache();
    return updated;
  }

  async deleteSource(id: string) {
    const existing = await this.repository.getSource(id);
    if (!existing) throw new NotFoundException("Knowledge source not found");
    const deleted = await this.repository.deleteSource(id);
    await this.invalidateRagCache();
    return deleted;
  }

  async getSource(id: string) {
    const source = await this.repository.getSource(id);
    if (!source) throw new NotFoundException("Knowledge source not found");
    return source;
  }

  async listSources(options?: { gradeId?: string; status?: string; type?: string }) {
    return this.repository.listSources(options);
  }

  async getStats() {
    const [totalSources, indexedSources, pendingSources, failedSources, disabledSources, totalChunks, totalEmbeddedChunks] = await Promise.all([
      this.prisma.aiKnowledgeSource.count({ where: { deletedAt: null } }),
      this.prisma.aiKnowledgeSource.count({ where: { status: "INDEXED", deletedAt: null } }),
      this.prisma.aiKnowledgeSource.count({ where: { status: "PENDING", deletedAt: null } }),
      this.prisma.aiKnowledgeSource.count({ where: { status: "FAILED", deletedAt: null } }),
      this.prisma.aiKnowledgeSource.count({ where: { isEnabled: false, deletedAt: null } }),
      this.prisma.aiKnowledgeChunk.count(),
      this.prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`SELECT COUNT(*)::bigint AS "count" FROM "ai_knowledge_chunks" WHERE "embedding" IS NOT NULL`).then((rows) => Number(rows[0]?.count ?? 0)),
    ]);

    const sourcesByType = await this.prisma.aiKnowledgeSource.groupBy({
      by: ["type"],
      where: { deletedAt: null },
      _count: { id: true },
    });

    return {
      totalSources,
      indexedSources,
      pendingSources,
      failedSources,
      disabledSources,
      totalChunks,
      totalEmbeddedChunks,
      coverage: totalSources > 0 ? Math.round((indexedSources / totalSources) * 100) : 0,
      sourcesByType: sourcesByType.map((s) => ({ type: s.type, count: s._count.id })),
    };
  }

  async searchPreview(query: string, options?: { gradeId?: string; termId?: string }) {
    const semantic = await this.search.semanticSearch(query, {
      gradeId: options?.gradeId,
      termId: options?.termId,
      topK: 8,
      includeDisabled: true,
    });

    const results = semantic.length > 0
      ? semantic
      : await this.search.keywordSearch(query, { gradeId: options?.gradeId, limit: 8, includeDisabled: true });

    return results.map((r) => ({
      chunkId: r.chunkId,
      content: r.content.slice(0, 500),
      score: r.score,
      sourceId: r.sourceId,
      sourceTitle: r.sourceTitle,
      sourceType: r.sourceType,
    }));
  }

  async reindexSource(sourceId: string): Promise<void> {
    const source = await this.repository.getSource(sourceId);
    if (!source) throw new NotFoundException("Knowledge source not found");

    await this.repository.updateSource(sourceId, { status: "PROCESSING" });

    try {
      const content = await this.extractSourceContent(source);

      if (!content.trim()) {
        throw new BadRequestException("No content to index");
      }

      const chunks = this.chunking.chunkText(content);

      await this.repository.deleteChunksBySource(sourceId);

      const embeddings = await this.embedding.generateEmbeddings(chunks.map((c) => c.content));

      const chunkData: { sourceId: string; content: string; chunkIndex: number; embedding: number[] }[] =
        chunks.map((chunk, i) => ({
          sourceId,
          content: chunk.content,
          chunkIndex: chunk.index,
          embedding: embeddings[i],
        }));

      await this.repository.createChunks(chunkData);

      await this.repository.updateSource(sourceId, {
        status: "INDEXED",
        chunkCount: chunks.length,
      });

      await this.invalidateRagCache();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      Logger.error(`Re-indexing failed for source ${sourceId}: ${message}`, "AiKnowledgeBaseService");
      await this.repository.updateSource(sourceId, { status: "FAILED" });
      throw new BadRequestException(`Re-indexing failed: ${message}`);
    }
  }

  async searchKnowledge(
    query: string,
    options?: { gradeId?: string; termId?: string },
  ) {
    const cacheKey = `ai:rag:${options?.gradeId ?? "g"}:${options?.termId ?? "t"}:${normalizeRagQuery(query)}`;
    const cached = await this.cache.get<SearchResult[]>(cacheKey);
    if (cached) return cached;

    const semantic = await this.search.semanticSearch(query, {
      gradeId: options?.gradeId,
      termId: options?.termId,
    });

    const result = semantic.length > 0
      ? semantic
      : await this.search.keywordSearch(query, { gradeId: options?.gradeId });

    if (result.length > 0) {
      await this.cache.set(cacheKey, result, 600);
    }
    return result;
  }

  private async invalidateRagCache(): Promise<void> {
    await this.cache.delByPattern("ai:rag:*");
  }

  async getGrades() {
    return this.prisma.grade.findMany({
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true },
    });
  }

  async getTerms() {
    return this.prisma.term.findMany({
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true },
    });
  }

  private async extractSourceContent(source: { type: string; title: string; filePath?: string | null; url?: string | null; description?: string | null }): Promise<string> {
    if (source.filePath) {
      return this.readFileContent(source.filePath, source.type);
    }

    if (source.type === "URL" && source.url) {
      return this.fetchUrlContent(source.url);
    }

    if (source.type === "JSON" && source.description) {
      return this.flattenJsonContent(source.description);
    }

    if (source.type === "LESSON" && source.url) {
      const lesson = await this.prisma.lesson.findUnique({
        where: { id: source.url },
        select: { title: true },
      });
      if (lesson) {
        return `Lesson: ${lesson.title}\n[Full lesson content not available via API]`;
      }
    }

    if (source.type === "TXT" || source.type === "MD") {
      return `[${source.type}] ${source.title}\n${source.description ?? ""}`;
    }

    return `[${source.type}] ${source.title}\n${source.description ?? ""}`;
  }

  private flattenJsonContent(raw: string): string {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  }

  private async readFileContent(filePath: string, _fileType: string): Promise<string> {
    try {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(process.cwd(), filePath);

      const ext = path.extname(absolutePath).toLowerCase();

      if (ext === ".txt" || ext === ".md") {
        return fs.readFile(absolutePath, "utf-8");
      }

      if (ext === ".json") {
        const raw = await fs.readFile(absolutePath, "utf-8");
        return this.flattenJsonContent(raw);
      }

      if (ext === ".pdf") {
        try {
          const pdfParse = (await import("pdf-parse")) as unknown as (data: Buffer) => Promise<{ text: string }>;
          const dataBuffer = await fs.readFile(absolutePath);
          const pdfData = await pdfParse(dataBuffer);
          return pdfData.text ?? "";
        } catch (err) {
          Logger.warn(`PDF parsing failed, falling back: ${err}`, "AiKnowledgeBaseService");
          return fs.readFile(absolutePath, "utf-8").catch(() => `[PDF file: ${path.basename(filePath)}]`);
        }
      }

      if (ext === ".docx") {
        try {
          const mammoth = await import("mammoth");
          const dataBuffer = await fs.readFile(absolutePath);
          const result = await mammoth.extractRawText({ buffer: dataBuffer });
          return result.value ?? "";
        } catch (err) {
          Logger.warn(`DOCX parsing failed, falling back: ${err}`, "AiKnowledgeBaseService");
          return `[DOCX file: ${path.basename(filePath)}]`;
        }
      }

      return `[File: ${path.basename(filePath)}]`;
    } catch {
      return `[File: ${path.basename(filePath)}]`;
    }
  }

  private async fetchUrlContent(url: string): Promise<string> {
    try {
      const safeUrl = assertSafeExternalUrl(url);
      const response = await fetch(safeUrl, {
        signal: AbortSignal.timeout(10000),
        redirect: "manual",
      });
      if (response.status >= 300 && response.status < 400) {
        throw new Error("Redirects are not allowed");
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      if (text.length > 2 * 1024 * 1024) {
        throw new Error("Content exceeds maximum size");
      }
      return text;
    } catch {
      return `[Content from ${url}]`;
    }
  }
}
