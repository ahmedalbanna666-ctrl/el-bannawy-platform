import { Module } from "@nestjs/common";
import { DocxExtractorService } from "./services/docx-extractor.service";

@Module({
  providers: [DocxExtractorService],
  exports: [DocxExtractorService],
})
export class DocumentImportModule {}
