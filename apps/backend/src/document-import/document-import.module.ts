import { Module } from "@nestjs/common";
import { DocxExtractorService } from "./services/docx-extractor.service";
import { VocabularyTableV1Parser } from "./parsers/vocabulary-table-v1.parser";
import { VocabularyTableV2Parser } from "./parsers/vocabulary-table-v2.parser";
import { VocabularyPreviewService } from "./services/vocabulary-preview.service";
import { VocabularyPersistenceService } from "./services/vocabulary-persistence.service";

@Module({
  providers: [DocxExtractorService, VocabularyTableV1Parser, VocabularyTableV2Parser, VocabularyPreviewService, VocabularyPersistenceService],
  exports: [DocxExtractorService, VocabularyPreviewService, VocabularyTableV2Parser, VocabularyPersistenceService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class DocumentImportModule {}
