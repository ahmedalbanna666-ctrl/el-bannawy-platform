import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AiKnowledgeBaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  createSource(data: Record<string, unknown>) {
    return this.prisma.aiKnowledgeSource.create({ data: data as any });
  }

  updateSource(id: string, data: Record<string, unknown>) {
    return this.prisma.aiKnowledgeSource.update({ where: { id }, data: data as any });
  }

  deleteSource(id: string) {
    return this.prisma.aiKnowledgeSource.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  getSource(id: string) {
    return this.prisma.aiKnowledgeSource.findFirst({ where: { id, deletedAt: null } });
  }

  listSources(options?: { gradeId?: string; status?: string; type?: string }) {
    return this.prisma.aiKnowledgeSource.findMany({
      where: { deletedAt: null, ...options } as any,
      orderBy: { createdAt: "desc" },
    });
  }

  getChunksBySource(sourceId: string) {
    return this.prisma.aiKnowledgeChunk.findMany({ where: { sourceId }, orderBy: { chunkIndex: "asc" } });
  }

  deleteChunksBySource(sourceId: string) {
    return this.prisma.aiKnowledgeChunk.deleteMany({ where: { sourceId } });
  }

  createChunks(data: { sourceId: string; content: string; chunkIndex: number; embedding?: number[] }[]) {
    if (data.length === 0) {
      return this.prisma.aiKnowledgeChunk.createMany({ data: [] });
    }

    const rows = data.map((d) =>
      Prisma.sql`(gen_random_uuid(), ${d.sourceId}::uuid, ${d.content}, ${
        d.embedding ? Prisma.sql`${`[${d.embedding.join(",")}]`}::vector` : Prisma.sql`NULL`
      }, ${d.chunkIndex}, now())`,
    );

    return this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO "ai_knowledge_chunks" ("id", "sourceId", "content", "embedding", "chunkIndex", "createdAt")
      VALUES ${Prisma.join(rows, ",")}
    `);
  }
}
