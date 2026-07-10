import { Injectable } from "@nestjs/common";
import { DocxExtractorService } from "./docx-extractor.service";
import { VocabularyTableV1Parser } from "../parsers/vocabulary-table-v1.parser";
import type { VocabularyImportPreview } from "../types/vocabulary-preview.types";

@Injectable()
export class VocabularyPreviewService {
  constructor(
    private readonly extractor: DocxExtractorService,
    private readonly parser: VocabularyTableV1Parser,
  ) {}

  async preview(buffer: Buffer, originalName: string): Promise<VocabularyImportPreview> {
    this.extractor.validateDocxFile(buffer, originalName);
    const document = await this.extractor.extract(buffer);
    return this.parser.parse(document);
  }

  previewFromDocument(document: Parameters<VocabularyTableV1Parser["parse"]>[0]): VocabularyImportPreview {
    return this.parser.parse(document);
  }
}
