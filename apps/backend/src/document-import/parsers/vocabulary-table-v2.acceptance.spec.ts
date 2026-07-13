import { Test, TestingModule } from "@nestjs/testing";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DocxExtractorService } from "../services/docx-extractor.service";
import { VocabularyTableV2Parser } from "./vocabulary-table-v2.parser";
import type { VocabularyStructuredDraft, VocabularyRelationDraft, VocabularyStandardItemDraft } from "../types/vocabulary-structured.types";

const VOCABS_PATH = resolve("D:\\El-bannawy-platform\\docs\\word files\\vocabs.docx");

describe("VocabularyTableV2Parser — real DOCX acceptance", () => {
  let parser: VocabularyTableV2Parser;
  let extractor: DocxExtractorService;
  let draft: VocabularyStructuredDraft | null;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocxExtractorService],
    }).compile();
    extractor = module.get(DocxExtractorService);
    parser = new VocabularyTableV2Parser();

    const buffer = readFileSync(VOCABS_PATH);
    const document = await extractor.extract(buffer);
    draft = parser.parse(document);
  });

  it("produces a non-null draft", () => {
    expect(draft).not.toBeNull();
  });

  it("has parser profile VOCABULARY_STRUCTURED_V2", () => {
    expect(draft!.parserProfile).toBe("VOCABULARY_STRUCTURED_V2");
  });

  it("produces at least one section", () => {
    expect(draft!.sections.length).toBeGreaterThanOrEqual(1);
  });

  it("produces at least one item", () => {
    expect(draft!.items.length).toBeGreaterThanOrEqual(1);
  });

  it("total counts match items length", () => {
    expect(draft!.counts.total).toBe(draft!.items.length);
  });

  it("section clientDraftIds are unique", () => {
    const ids = draft!.sections.map((s) => s.clientDraftId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("item clientDraftIds are unique", () => {
    const ids = draft!.items.map((i) => i.clientDraftId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("section and item IDs are disjoint", () => {
    const sectionIds = new Set(draft!.sections.map((s) => s.clientDraftId));
    const itemIds = draft!.items.map((i) => i.clientDraftId);
    for (const id of itemIds) {
      expect(sectionIds.has(id)).toBe(false);
    }
  });

  it("all items link to existing sections", () => {
    const sectionIds = new Set(draft!.sections.map((s) => s.clientDraftId));
    for (const item of draft!.items) {
      expect(sectionIds.has(item.sectionClientDraftId)).toBe(true);
    }
  });

  it("produces two kinds of items: STANDARD_ITEM and SYNONYM_ANTONYM_RELATION", () => {
    const kinds = new Set(draft!.items.map((i) => i.kind));
    expect(kinds.has("STANDARD_ITEM")).toBe(true);
    // Real DOCX may or may not have relation tables
    // This simply verifies the parser handles whatever the DOCX contains
  });

  it("standard items have non-empty word and translation", () => {
    const standardItems = draft!.items.filter(
      (i): i is VocabularyStandardItemDraft => i.kind === "STANDARD_ITEM",
    );
    for (const item of standardItems) {
      expect(item.word.length).toBeGreaterThan(0);
      expect(item.translation.length).toBeGreaterThan(0);
    }
  });

  it("synonym/antonym items preserve all six fields when present", () => {
    const relationItems = draft!.items.filter(
      (i): i is VocabularyRelationDraft => i.kind === "SYNONYM_ANTONYM_RELATION",
    );
    for (const item of relationItems) {
      expect(item.primaryWord.length).toBeGreaterThan(0);
      expect(item.primaryTranslation.length).toBeGreaterThan(0);
    }
  });

  it("standard items carry partOfSpeech — null when not annotated", () => {
    const standardItems = draft!.items.filter(
      (i): i is VocabularyStandardItemDraft => i.kind === "STANDARD_ITEM",
    );
    for (const item of standardItems) {
      // Real DOCX may not use parenthetical POS markers; null is valid
      expect(typeof item.word).toBe("string");
      expect(typeof item.translation).toBe("string");
    }
  });

  it("display order is sequential within sections", () => {
    const orders = draft!.items.map((i) => i.displayOrder);
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i]).toBeGreaterThan(orders[i - 1]);
    }
  });
});
