import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { EmbeddingService } from "./embedding.service";

export interface SearchResult {
  chunkId: string;
  content: string;
  score: number;
  sourceId: string;
  sourceTitle: string;
  sourceType: string;
}

interface ChunkRow {
  chunkId: string;
  content: string;
  score: number;
  sourceId: string;
  sourceTitle: string;
  sourceType: string;
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embedding: EmbeddingService,
  ) {}

  async semanticSearch(
    query: string,
    options?: {
      gradeId?: string;
      termId?: string;
      subject?: string;
      topK?: number;
      includeDisabled?: boolean;
    },
  ): Promise<SearchResult[]> {
    const topK = options?.topK ?? 5;

    const sources = await this.prisma.aiKnowledgeSource.findMany({
      where: {
        status: "INDEXED",
        deletedAt: null,
        ...(options?.includeDisabled ? {} : { isEnabled: true }),
        ...(options?.gradeId ? { gradeId: options.gradeId } : {}),
        ...(options?.termId ? { termId: options.termId } : {}),
        ...(options?.subject ? { subject: options.subject } : {}),
      },
      select: { id: true, title: true, type: true },
    });

    if (sources.length === 0) return [];

    const sourceIds = sources.map((s) => s.id);

    const queryEmbedding = await this.embedding.generateEmbedding(query);
    const embeddingLiteral = `[${queryEmbedding.join(",")}]`;

    const rows = await this.prisma.$queryRaw<ChunkRow[]>(Prisma.sql`
      SELECT
        c."id" AS "chunkId",
        c."content" AS "content",
        s."id" AS "sourceId",
        s."title" AS "sourceTitle",
        s."type" AS "sourceType",
        1 - (c."embedding" <=> ${embeddingLiteral}::vector) AS "score"
      FROM "ai_knowledge_chunks" c
      INNER JOIN "ai_knowledge_sources" s ON s."id" = c."sourceId"
      WHERE c."sourceId" IN (${Prisma.join(sourceIds.map((id) => Prisma.sql`${id}::uuid`))})
        AND c."embedding" IS NOT NULL
      ORDER BY c."embedding" <=> ${embeddingLiteral}::vector
      LIMIT ${topK}
    `);

    return rows
      .map((r) => ({
        chunkId: r.chunkId,
        content: r.content,
        score: r.score,
        sourceId: r.sourceId,
        sourceTitle: r.sourceTitle,
        sourceType: r.sourceType,
      }))
      .filter((r) => r.score > 0);
  }

  async keywordSearch(
    query: string,
    options?: { gradeId?: string; limit?: number; includeDisabled?: boolean },
  ): Promise<SearchResult[]> {
    const limit = options?.limit ?? 5;
    const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

    const sources = await this.prisma.aiKnowledgeSource.findMany({
      where: {
        status: "INDEXED",
        deletedAt: null,
        ...(options?.includeDisabled ? {} : { isEnabled: true }),
        ...(options?.gradeId ? { gradeId: options.gradeId } : {}),
      },
      select: { id: true, title: true, type: true },
    });

    if (sources.length === 0) return [];

    const sourceIds = sources.map((s) => s.id);
    const chunks = await this.prisma.aiKnowledgeChunk.findMany({
      where: { sourceId: { in: sourceIds } },
      select: { id: true, content: true, sourceId: true },
      take: 200,
    });

    const sourceMap = new Map(sources.map((s) => [s.id, s]));

    const scored = chunks
      .map((c) => {
        const lower = c.content.toLowerCase();
        let score = 0;
        for (const word of queryWords) {
          const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
          const matches = lower.match(regex);
          if (matches) score += matches.length;
        }
        return { ...c, score };
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map((c) => {
      const source = sourceMap.get(c.sourceId);
      return {
        chunkId: c.id,
        content: c.content,
        score: c.score / Math.max(queryWords.length, 1),
        sourceId: source?.id ?? "",
        sourceTitle: source?.title ?? "Unknown",
        sourceType: source?.type ?? "",
      };
    });
  }
}
