import { Module } from "@nestjs/common";
import { DocxExtractorService } from "./services/docx-extractor.service";
import { VocabularyTableV1Parser } from "./parsers/vocabulary-table-v1.parser";
import { VocabularyPreviewService } from "./services/vocabulary-preview.service";

@Module({
  providers: [DocxExtractorService, VocabularyTableV1Parser, VocabularyPreviewService],
  exports: [DocxExtractorService, VocabularyPreviewService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class DocumentImportModule {}
