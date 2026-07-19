import { Injectable } from "@nestjs/common";
import { DocxExtractorService } from "./docx-extractor.service";
import { VocabularyTableV2Parser } from "../parsers/vocabulary-table-v2.parser";
import type { VocabularyStructuredDraft } from "../types/vocabulary-structured.types";

@Injectable()
export class VocabularyPreviewService {
  constructor(
    private readonly extractor: DocxExtractorService,
    private readonly parser: VocabularyTableV2Parser,
  ) {}

  async preview(buffer: Buffer, originalName: string): Promise<VocabularyStructuredDraft> {
    this.extractor.validateDocxFile(buffer, originalName);
    const document = await this.extractor.extract(buffer);
    return this.parser.parse(document);
  }

  previewFromDocument(document: Parameters<VocabularyTableV2Parser["parse"]>[0]): VocabularyStructuredDraft {
    return this.parser.parse(document);
  }
}
