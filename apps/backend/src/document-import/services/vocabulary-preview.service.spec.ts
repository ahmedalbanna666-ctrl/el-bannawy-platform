import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { VocabularyPreviewService } from "./vocabulary-preview.service";
import { DocxExtractorService } from "./docx-extractor.service";
import { VocabularyTableV1Parser } from "../parsers/vocabulary-table-v1.parser";
import type { VocabularyImportPreview } from "../types/vocabulary-preview.types";
import {
  createSimpleVocabTable,
  createFourColumnTable,
  createMixedDocument,
  createEmptyBufferDocx,
  createNonZipBuffer,
} from "../../../test/fixtures/docx-fixtures";

describe("VocabularyPreviewService", () => {
  let service: VocabularyPreviewService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VocabularyPreviewService, DocxExtractorService, VocabularyTableV1Parser],
    }).compile();
    service = module.get(VocabularyPreviewService);
  });

  describe("preview", () => {
    it("returns typed preview for valid 2-column DOCX", async () => {
      const buf = await createSimpleVocabTable();
      const result = await service.preview(buf, "test.docx");
      expect(result.parserProfile).toBe("VOCABULARY_TABLE_V1");
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      expect(result.items[0].word).toBeTruthy();
      expect(result.items[0].translation).toBeTruthy();
    });

    it("returns typed preview for valid 4-column DOCX", async () => {
      const buf = await createFourColumnTable();
      const result = await service.preview(buf, "test.docx");
      expect(result.items.length).toBeGreaterThanOrEqual(2);
    });

    it("preserves Arabic text from real DOCX", async () => {
      const buf = await createSimpleVocabTable();
      const result = await service.preview(buf, "test.docx");
      const translations = result.items.map((i) => i.translation);
      expect(translations.some((t) => t.includes("يتعلم"))).toBe(true);
    });

    it("rejects invalid extension", async () => {
      const buf = Buffer.from("content");
      await expect(service.preview(buf, "test.pdf")).rejects.toThrow(BadRequestException);
    });

    it("rejects non-ZIP buffer", async () => {
      const buf = createNonZipBuffer();
      await expect(service.preview(buf, "fake.docx")).rejects.toThrow(BadRequestException);
    });

    it("rejects malformed DOCX", async () => {
      const buf = Buffer.from("not a docx");
      await expect(service.preview(buf, "test.docx")).rejects.toThrow();
    });

    it("rejects empty file", async () => {
      const buf = await createEmptyBufferDocx();
      await expect(service.preview(buf, "empty.docx")).rejects.toThrow(BadRequestException);
    });

    it("counts match actual items", async () => {
      const buf = await createSimpleVocabTable();
      const result = await service.preview(buf, "test.docx");
      expect(result.counts.total).toBe(result.items.length);
      expect(result.counts.valid + result.counts.warning + result.counts.invalid).toBe(result.items.length);
    });

    it("parserProfile exact value", async () => {
      const buf = await createSimpleVocabTable();
      const result = await service.preview(buf, "test.docx");
      expect(result.parserProfile).toBe("VOCABULARY_TABLE_V1");
    });

    it("performs zero database writes — service has no Prisma dependency", async () => {
      const buf = await createSimpleVocabTable();
      const result = await service.preview(buf, "test.docx");
      expect(result).toBeDefined();
      expect(result.items.length).toBeGreaterThan(0);
    });
  });
});
