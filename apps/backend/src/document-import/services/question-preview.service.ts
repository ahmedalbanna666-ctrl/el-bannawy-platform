import { Injectable } from "@nestjs/common";
import { DocxExtractorService } from "./docx-extractor.service";
import { QuestionsTableV1Parser } from "../parsers/questions-table-v1.parser";
import type { QuestionImportPreview } from "../types/question-preview.types";

@Injectable()
export class QuestionPreviewService {
  constructor(
    private readonly extractor: DocxExtractorService,
    private readonly parser: QuestionsTableV1Parser,
  ) {}

  async preview(buffer: Buffer, originalName: string): Promise<QuestionImportPreview> {
    this.extractor.validateDocxFile(buffer, originalName);
    const document = await this.extractor.extract(buffer);
    return this.parser.parse(document);
  }
}
