import { Module } from "@nestjs/common";
import { AiKnowledgeBaseController } from "./ai-knowledge-base.controller";
import { AiKnowledgeBaseService } from "./ai-knowledge-base.service";
import { AiKnowledgeBaseRepository } from "./ai-knowledge-base.repository";
import { ChunkingService } from "./rag/chunking.service";
import { EmbeddingService } from "./rag/embedding.service";
import { SearchService } from "./rag/search.service";
import { StorageModule } from "../common/storage/storage.module";

@Module({
  imports: [StorageModule],
  controllers: [AiKnowledgeBaseController],
  providers: [
    AiKnowledgeBaseService,
    AiKnowledgeBaseRepository,
    ChunkingService,
    EmbeddingService,
    SearchService,
  ],
  exports: [AiKnowledgeBaseService, EmbeddingService, SearchService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AiKnowledgeBaseModule {}
