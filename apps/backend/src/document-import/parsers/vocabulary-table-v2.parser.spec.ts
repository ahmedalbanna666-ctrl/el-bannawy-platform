import { VocabularyTableV2Parser } from "./vocabulary-table-v2.parser";
import type { NormalizedDocument, NormalizedTable, NormalizedRow } from "../types/normalized-document.types";
import type { VocabularyStructuredDraft, VocabularyStandardItemDraft, VocabularyRelationDraft, VocabularySectionDraft } from "../types/vocabulary-structured.types";

function cell(columnIndex: number, text: string) {
  return { columnIndex, text };
}

function row(rowIndex: number, texts: string[]): NormalizedRow {
  return {
    rowIndex,
    cells: texts.map((t, i) => cell(i, t)),
  };
}

function table(tableIndex: number, rows: NormalizedRow[]): NormalizedTable {
  return { tableIndex, rows };
}

function doc(tables: NormalizedTable[]): NormalizedDocument {
  let totalRows = 0;
  for (const t of tables) {
    totalRows += t.rows.length;
  }
  return {
    tables,
    paragraphs: [],
    metadata: { totalTables: tables.length, totalParagraphs: 0, totalRows },
  };
}

describe("VocabularyTableV2Parser", () => {
  let parser: VocabularyTableV2Parser;

  beforeEach(() => {
    parser = new VocabularyTableV2Parser();
  });

  // ─── Section detection ───────────────────────────────────────────────────

  describe("section detection", () => {
    it("creates a STANDARD_VOCABULARY section for a standard table", () => {
      const input = doc([
        table(0, [
          row(0, ["Key vocabularies المفردات الرئيسيه"]),
          row(1, ["hello", "مرحبا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.sections.length).toBe(1);
      expect(result.sections[0].kind).toBe("STANDARD_VOCABULARY");
      expect(result.sections[0].title).toContain("Key vocabularies");
      expect(result.sections[0].sourceTableIndex).toBe(0);
      expect(result.sections[0].sourceTitleRowIndex).toBe(0);
    });

    it("creates a SYNONYM_ANTONYM section for a synonym/antonym table", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.sections.length).toBe(1);
      expect(result.sections[0].kind).toBe("SYNONYM_ANTONYM");
    });

    it("creates multiple sections across multiple tables", () => {
      const input = doc([
        table(0, [
          row(0, ["Key vocabularies المفردات الرئيسيه"]),
          row(1, ["hello", "مرحبا"]),
        ]),
        table(1, [
          row(0, ["Extra vocabularies المفردات الاضافيه"]),
          row(1, ["world", "عالم"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.sections.length).toBe(2);
      expect(result.sections[0].kind).toBe("STANDARD_VOCABULARY");
      expect(result.sections[1].kind).toBe("STANDARD_VOCABULARY");
    });

    it("creates one section per SYNONYM_ANTONYM table", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
        table(1, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["polite", "مهذب", "", "", "rude", "وقح"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.sections.length).toBe(2);
      expect(result.sections[0].kind).toBe("SYNONYM_ANTONYM");
      expect(result.sections[1].kind).toBe("SYNONYM_ANTONYM");
    });

    it("removes orphan sections with no items", () => {
      const input = doc([
        table(0, [
          row(0, ["Key vocabularies المفردات الرئيسيه"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.sections.length).toBe(0);
    });

    it("creates section with null title when no section-title row exists", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["hello", "مرحبا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.sections.length).toBe(1);
      expect(result.sections[0].title).toBeNull();
      expect(result.sections[0].sourceTitleRowIndex).toBeNull();
    });

    it("assigns monotonic clientDraftId-based display order to sections", () => {
      const input = doc([
        table(0, [
          row(0, ["Key vocabularies المفردات الرئيسيه"]),
          row(1, ["hello", "مرحبا"]),
        ]),
        table(1, [
          row(0, ["Extra vocabularies المفردات الاضافيه"]),
          row(1, ["world", "عالم"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.sections[0].displayOrder).toBe(0);
      expect(result.sections[1].displayOrder).toBe(1);
    });
  });

  // ─── Standard items ──────────────────────────────────────────────────────

  describe("standard items", () => {
    it("parses 2-column rows as STANDARD_ITEM", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["hello", "مرحبا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(1);
      expect(result.items[0].kind).toBe("STANDARD_ITEM");
      if (result.items[0].kind === "STANDARD_ITEM") {
        expect(result.items[0].word).toBe("hello");
        expect(result.items[0].translation).toBe("مرحبا");
      }
    });

    it("parses 4-column rows as two STANDARD_ITEMs", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["a", "أ", "b", "ب"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(2);
      expect(result.items[0].kind).toBe("STANDARD_ITEM");
      expect(result.items[1].kind).toBe("STANDARD_ITEM");
      if (result.items[0].kind === "STANDARD_ITEM") {
        expect(result.items[0].word).toBe("a");
        expect(result.items[0].sourcePairIndex).toBe(0);
      }
      if (result.items[1].kind === "STANDARD_ITEM") {
        expect(result.items[1].word).toBe("b");
        expect(result.items[1].sourcePairIndex).toBe(1);
      }
    });

    it("skips header rows in standard tables", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "Meaning"]),
          row(1, ["hello", "مرحبا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(1);
      if (result.items[0].kind === "STANDARD_ITEM") {
        expect(result.items[0].word).toBe("hello");
      }
    });

    it("preserves part of speech from word cell", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["parade (n)", "عرض"]),
          row(2, ["bury (v)", "يدفن"]),
          row(3, ["royal (adj)", "ملكي"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(3);
      const words = result.items.filter((i): i is VocabularyStandardItemDraft => i.kind === "STANDARD_ITEM");
      expect(words[0].word).toBe("parade");
      expect(words[0].partOfSpeech).toBe("n");
      expect(words[1].word).toBe("bury");
      expect(words[1].partOfSpeech).toBe("v");
      expect(words[2].word).toBe("royal");
      expect(words[2].partOfSpeech).toBe("adj");
    });

    it("returns null partOfSpeech when not present", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["hello", "مرحبا"]),
        ]),
      ]);
      const result = parser.parse(input);
      if (result.items[0].kind === "STANDARD_ITEM") {
        expect(result.items[0].partOfSpeech).toBeNull();
      }
    });

    it("sets sectionClientDraftId linking back to section", () => {
      const input = doc([
        table(0, [
          row(0, ["Key vocabularies المفردات الرئيسيه"]),
          row(1, ["hello", "مرحبا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].sectionClientDraftId).toBe(result.sections[0].clientDraftId);
    });
  });

  // ─── Relation items ──────────────────────────────────────────────────────

  describe("relation items (synonym/antonym)", () => {
    it("produces SYNONYM_ANTONYM_RELATION items from 6-column tables", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(1);
      expect(result.items[0].kind).toBe("SYNONYM_ANTONYM_RELATION");
    });

    it("preserves all six fields in relation row", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(1);
      const rel = result.items[0] as VocabularyRelationDraft;
      expect(rel.primaryWord).toBe("care");
      expect(rel.primaryTranslation).toBe("يهتم");
      expect(rel.synonym).toBe("concern");
      expect(rel.synonymTranslation).toBe("اهتمام");
      expect(rel.antonym).toBe("ignore");
      expect(rel.antonymTranslation).toBe("يتجاهل");
    });

    it("sets null synonym/antonym when empty", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["polite", "مهذب", "", "", "rude", "وقح"]),
        ]),
      ]);
      const result = parser.parse(input);
      const rel = result.items[0] as VocabularyRelationDraft;
      expect(rel.synonym).toBeNull();
      expect(rel.synonymTranslation).toBeNull();
      expect(rel.antonym).toBe("rude");
      expect(rel.antonymTranslation).toBe("وقح");
    });

    it("sets null antonym when empty", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "يهتم", "concern", "اهتمام", "", ""]),
        ]),
      ]);
      const result = parser.parse(input);
      const rel = result.items[0] as VocabularyRelationDraft;
      expect(rel.synonym).toBe("concern");
      expect(rel.synonymTranslation).toBe("اهتمام");
      expect(rel.antonym).toBeNull();
      expect(rel.antonymTranslation).toBeNull();
    });

    it("produces SYNONYM_ANTONYM_RELATION kind type discriminator", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].kind).toBe("SYNONYM_ANTONYM_RELATION");
    });

    it("links relation items to their section via sectionClientDraftId", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.sections.length).toBe(1);
      expect(result.items[0].sectionClientDraftId).toBe(result.sections[0].clientDraftId);
    });

    it("adds SYNONYM_ANTONYM_RAW_TEXT warning when synonym or antonym is present", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].warnings).toContain("SYNONYM_ANTONYM_RAW_TEXT");
    });

    it("adds SYNONYM_ANTONYM_RAW_TEXT warning only once per item", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
      ]);
      const result = parser.parse(input);
      const synCount = result.items[0].warnings.filter((w) => w === "SYNONYM_ANTONYM_RAW_TEXT").length;
      expect(synCount).toBe(1);
    });

    it("does not add SYNONYM_ANTONYM_RAW_TEXT when synonym and antonym are empty", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "يهتم", "", "", "", ""]),
        ]),
      ]);
      const result = parser.parse(input);
      const rel = result.items[0] as VocabularyRelationDraft;
      expect(rel.warnings).not.toContain("SYNONYM_ANTONYM_RAW_TEXT");
    });

    it("preserves raw concatenated Arabic in relation cells — no guessing", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["conflict", "خلاف", "disagreement", "خلافاعتبار", "agreement", "اتفاق"]),
        ]),
      ]);
      const result = parser.parse(input);
      const rel = result.items[0] as VocabularyRelationDraft;
      expect(rel.synonymTranslation).toBe("خلافاعتبار");
    });

    it("preserves raw concatenated English in relation cells — no guessing", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "يهتم", "concernregard", "اهتمام", "ignore", "يتجاهل"]),
        ]),
      ]);
      const result = parser.parse(input);
      const rel = result.items[0] as VocabularyRelationDraft;
      expect(rel.synonym).toBe("concernregard");
    });

    it("marks relation row as INVALID when primary word is empty", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].errors).toContain("MISSING_WORD");
      expect(result.items[0].status).toBe("INVALID");
    });

    it("marks relation row as INVALID when primary translation is empty", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].errors).toContain("MISSING_TRANSLATION");
      expect(result.items[0].status).toBe("INVALID");
    });

    it("skips completely empty rows in relation tables", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["", "", "", "", "", ""]),
          row(2, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(1);
    });

    it("creates a section even without a section-title row in synonym/antonym table", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.sections.length).toBe(1);
      expect(result.sections[0].kind).toBe("SYNONYM_ANTONYM");
    });
  });

  // ─── Mixed layouts ───────────────────────────────────────────────────────

  describe("mixed layouts", () => {
    it("interleaves standard and relation sections when tables alternate", () => {
      const input = doc([
        table(0, [
          row(0, ["Key vocabularies المفردات الرئيسيه"]),
          row(1, ["hello", "مرحبا"]),
        ]),
        table(1, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.sections.length).toBe(2);
      expect(result.sections[0].kind).toBe("STANDARD_VOCABULARY");
      expect(result.sections[1].kind).toBe("SYNONYM_ANTONYM");
    });

    it("preserves sectionClientDraftId links in mixed layouts", () => {
      const input = doc([
        table(0, [
          row(0, ["Key vocabularies المفردات الرئيسيه"]),
          row(1, ["hello", "مرحبا"]),
        ]),
        table(1, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
      ]);
      const result = parser.parse(input);
      const standardItem = result.items.find((i) => i.kind === "STANDARD_ITEM");
      const relationItem = result.items.find((i) => i.kind === "SYNONYM_ANTONYM_RELATION");
      expect(standardItem?.sectionClientDraftId).toBe(result.sections[0].clientDraftId);
      expect(relationItem?.sectionClientDraftId).toBe(result.sections[1].clientDraftId);
    });
  });

  // ─── Deduplication ───────────────────────────────────────────────────────

  describe("deduplication", () => {
    it("marks duplicate standard items with DUPLICATE_IN_DOCUMENT warning", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["hello", "مرحبا"]),
          row(2, ["hello", "اهلا"]),
        ]),
      ]);
      const result = parser.parse(input);
      const items = result.items.filter((i): i is VocabularyStandardItemDraft => i.kind === "STANDARD_ITEM");
      expect(items[0].status).toBe("VALID");
      expect(items[1].status).toBe("WARNING");
      expect(items[1].warnings).toContain("DUPLICATE_IN_DOCUMENT");
    });

    it("does not deduplicate relation items", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
          row(2, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
      ]);
      const result = parser.parse(input);
      const relations = result.items.filter((i) => i.kind === "SYNONYM_ANTONYM_RELATION");
      expect(relations.length).toBe(2);
      expect(relations[0].warnings).not.toContain("DUPLICATE_IN_DOCUMENT");
      expect(relations[1].warnings).not.toContain("DUPLICATE_IN_DOCUMENT");
    });

    it("deduplication is case-insensitive for standard items", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["Hello", "مرحبا"]),
          row(2, ["hello", "اهلا"]),
        ]),
      ]);
      const result = parser.parse(input);
      const stdItems = result.items.filter((i): i is VocabularyStandardItemDraft => i.kind === "STANDARD_ITEM");
      expect(stdItems.length).toBe(2);
      expect(stdItems[1].warnings).toContain("DUPLICATE_IN_DOCUMENT");
    });

    it("deduplication normalizes whitespace", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["look after", "يعتني"]),
          row(2, ["look  after", "يهتم"]),
        ]),
      ]);
      const result = parser.parse(input);
      const stdItems = result.items.filter((i): i is VocabularyStandardItemDraft => i.kind === "STANDARD_ITEM");
      expect(stdItems[1].warnings).toContain("DUPLICATE_IN_DOCUMENT");
    });

    it("first occurrence stays VALID, later becomes WARNING for standard items", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["hello", "مرحبا"]),
          row(2, ["world", "عالم"]),
          row(3, ["hello", "اهلا"]),
        ]),
      ]);
      const result = parser.parse(input);
      const stdItems = result.items.filter((i): i is VocabularyStandardItemDraft => i.kind === "STANDARD_ITEM");
      expect(stdItems[0].status).toBe("VALID");
      expect(stdItems[2].status).toBe("WARNING");
    });
  });

  // ─── Invalid row handling ────────────────────────────────────────────────

  describe("invalid row handling", () => {
    it("marks missing translation as INVALID for standard items", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["hello", ""]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].errors).toContain("MISSING_TRANSLATION");
      expect(result.items[0].status).toBe("INVALID");
    });

    it("marks missing word as INVALID for standard items", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["", "مرحبا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].errors).toContain("MISSING_WORD");
      expect(result.items[0].status).toBe("INVALID");
    });

    it("skips both-empty rows in standard tables", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["", ""]),
          row(2, ["hello", "مرحبا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(1);
    });

    it("handles empty rows gracefully when all are skipped", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "Meaning"]),
          row(1, ["", ""]),
          row(2, ["", ""]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(0);
    });
  });

  // ─── Source coordinates ──────────────────────────────────────────────────

  describe("source coordinates", () => {
    it("records correct sourceTableIndex for standard items", () => {
      const input = doc([
        table(0, [row(0, [""]), row(1, ["hello", "مرحبا"])]),
        table(1, [row(0, [""]), row(1, ["world", "عالم"])]),
      ]);
      const result = parser.parse(input);
      const stdItems = result.items.filter((i): i is VocabularyStandardItemDraft => i.kind === "STANDARD_ITEM");
      expect(stdItems[0].sourceTableIndex).toBe(0);
      expect(stdItems[1].sourceTableIndex).toBe(1);
    });

    it("records correct sourceRowIndex for standard items", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "Meaning"]),
          row(1, ["hello", "مرحبا"]),
          row(2, ["world", "عالم"]),
        ]),
      ]);
      const result = parser.parse(input);
      const stdItems = result.items.filter((i): i is VocabularyStandardItemDraft => i.kind === "STANDARD_ITEM");
      expect(stdItems[0].sourceRowIndex).toBe(1);
      expect(stdItems[1].sourceRowIndex).toBe(2);
    });

    it("records correct sourcePairIndex for standard items in 4-column rows", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["a", "أ", "b", "ب"]),
        ]),
      ]);
      const result = parser.parse(input);
      const stdItems = result.items.filter((i): i is VocabularyStandardItemDraft => i.kind === "STANDARD_ITEM");
      expect(stdItems[0].sourcePairIndex).toBe(0);
      expect(stdItems[1].sourcePairIndex).toBe(1);
    });

    it("records correct sourceTableIndex and sourceRowIndex for relation items", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
        table(1, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["polite", "مهذب", "", "", "rude", "وقح"]),
        ]),
      ]);
      const result = parser.parse(input);
      const relations = result.items.filter((i): i is VocabularyRelationDraft => i.kind === "SYNONYM_ANTONYM_RELATION");
      expect(relations[0].sourceTableIndex).toBe(0);
      expect(relations[0].sourceRowIndex).toBe(1);
      expect(relations[1].sourceTableIndex).toBe(1);
      expect(relations[1].sourceRowIndex).toBe(1);
    });
  });

  // ─── Display order ───────────────────────────────────────────────────────

  describe("display order", () => {
    it("is deterministic and sequential across all items", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["a", "أ"]),
          row(2, ["b", "ب"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].displayOrder).toBe(0);
      expect(result.items[1].displayOrder).toBe(1);
    });

    it("increments across mixed tables and layouts", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["a", "أ", "b", "ب"]),
        ]),
        table(1, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].displayOrder).toBe(0);
      expect(result.items[1].displayOrder).toBe(1);
      expect(result.items[2].displayOrder).toBe(2);
    });
  });

  // ─── Counts ──────────────────────────────────────────────────────────────

  describe("counts", () => {
    it("computes total, valid, warning, invalid counts across mixed items", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["hello", "مرحبا"]),
          row(2, ["hello", "اهلا"]),
          row(3, ["", "x"]),
          row(4, ["y", ""]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.counts.total).toBe(4);
      expect(result.counts.valid).toBe(1);
      expect(result.counts.warning).toBe(1);
      expect(result.counts.invalid).toBe(2);
    });

    it("counts relation items correctly", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
          row(2, ["", "", "", "", "", ""]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.counts.total).toBe(1);
      // Relation row has SYNONYM_ANTONYM_RAW_TEXT warning from non-empty synonym/antonym cells
      expect(result.counts.valid).toBe(0);
      expect(result.counts.warning).toBe(1);
    });
  });

  // ─── Empty document ──────────────────────────────────────────────────────

  describe("empty document", () => {
    it("returns empty result with warning for no tables", () => {
      const input = doc([]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(0);
      expect(result.counts.total).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  // ─── Item limit ──────────────────────────────────────────────────────────

  describe("item limit", () => {
    it("enforces maximum item count", () => {
      const rows: NormalizedRow[] = [row(0, [""])];
      for (let i = 1; i <= 510; i++) {
        rows.push(row(i, [`word${String(i)}`, `trans${String(i)}`]));
      }
      const input = doc([table(0, rows)]);
      const result = parser.parse(input);
      expect(result.items.length).toBeLessThanOrEqual(500);
      expect(result.errors.some((e) => e.includes("exceeded"))).toBe(true);
    });

    it("enforces maximum item count in relation tables", () => {
      const rows: NormalizedRow[] = [
        row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
      ];
      for (let i = 1; i <= 510; i++) {
        rows.push(row(i, [`word${String(i)}`, `trans${String(i)}`, "", "", "", ""]));
      }
      const input = doc([table(0, rows)]);
      const result = parser.parse(input);
      expect(result.items.length).toBeLessThanOrEqual(500);
      expect(result.errors.some((e) => e.includes("exceeded"))).toBe(true);
    });
  });

  // ─── Parser profile ──────────────────────────────────────────────────────

  describe("parserProfile", () => {
    it("returns exact parserProfile value", () => {
      const input = doc([]);
      const result = parser.parse(input);
      expect(result.parserProfile).toBe("VOCABULARY_STRUCTURED_V2");
    });
  });

  // ─── clientDraftId ───────────────────────────────────────────────────────

  describe("clientDraftId", () => {
    it("generates unique IDs for all items", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["a", "أ"]),
          row(2, ["b", "ب"]),
          row(3, ["c", "ت"]),
        ]),
      ]);
      const result = parser.parse(input);
      const ids = result.items.map((i) => i.clientDraftId);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("generates unique IDs for sections", () => {
      const input = doc([
        table(0, [
          row(0, ["Key vocabularies المفردات الرئيسيه"]),
          row(1, ["a", "أ"]),
        ]),
        table(1, [
          row(0, ["Extra vocabularies المفردات الاضافيه"]),
          row(1, ["b", "ب"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.sections[0].clientDraftId).not.toBe(result.sections[1].clientDraftId);
    });

    it("section and item IDs are distinct", () => {
      const input = doc([
        table(0, [
          row(0, ["Key vocabularies المفردات الرئيسيه"]),
          row(1, ["hello", "مرحبا"]),
        ]),
      ]);
      const result = parser.parse(input);
      const allIds = [
        result.sections[0].clientDraftId,
        ...result.items.map((i) => i.clientDraftId),
      ];
      expect(new Set(allIds).size).toBe(allIds.length);
    });
  });

  // ─── Section metadata ────────────────────────────────────────────────────

  describe("section metadata", () => {
    it("tracks sourceTitleRowIndex when section title is present", () => {
      const input = doc([
        table(0, [
          row(0, ["Key vocabularies المفردات الرئيسيه"]),
          row(1, ["hello", "مرحبا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.sections[0].sourceTitleRowIndex).toBe(0);
    });

    it("sets sourceTitleRowIndex null when no section title row exists", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["hello", "مرحبا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.sections[0].sourceTitleRowIndex).toBeNull();
    });
  });

  // ─── Section title row in synonym/antonym tables ─────────────────────────

  describe("section title row in synonym/antonym tables", () => {
    it("preserves section title from row 0 when present before semantic header", () => {
      const input = doc([
        table(0, [
          row(0, ["Extra vocabularies المفردات الاضافيه"]),
          row(1, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(2, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.sections.length).toBe(1);
      expect(result.sections[0].title).toContain("Extra vocabularies");
      expect(result.sections[0].sourceTitleRowIndex).toBe(0);
    });

    it("preserves section title between header and data rows", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["Extra vocabularies المفردات الاضافيه"]),
          row(2, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.sections.length).toBe(1);
      expect(result.sections[0].title).toContain("Extra vocabularies");
    });
  });

  // ─── Unsupported layouts ─────────────────────────────────────────────────

  describe("unsupported layouts", () => {
    it("warns on unsupported 3-column standard table", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["a", "b", "c"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(0);
      expect(result.warnings.some((w) => w.includes("unsupported"))).toBe(true);
    });

    it("warns on 5-column standard table", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["a", "b", "c", "d", "e"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(0);
      expect(result.warnings.some((w) => w.includes("unsupported"))).toBe(true);
    });

    it("processes mixed row widths per-row in standard tables", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["hello", "مرحبا"]),
          row(2, ["x", "y", "z"]),
        ]),
      ]);
      const result = parser.parse(input);
      const stdItems = result.items.filter((i): i is VocabularyStandardItemDraft => i.kind === "STANDARD_ITEM");
      expect(stdItems.length).toBe(1);
      expect(stdItems[0].word).toBe("hello");
      expect(result.warnings.some((w) => w.includes("unsupported"))).toBe(true);
    });
  });

  // ─── Full phrase preservation ────────────────────────────────────────────

  describe("full phrase preservation", () => {
    it("preserves multi-word English phrases", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["communicate with", "يتواصل مع", "sibling", "اخ"]),
          row(2, ["social media", "وسائل التواصل", "blend into", "يندمج في"]),
          row(3, ["stay in mind", "يبقى في الذهن", "stand out", "يبرز"]),
          row(4, ["make time", "يخصص وقت", "have a look", "يلقي نظرة"]),
          row(5, ["take time to", "يستغرق وقت", "tell the truth", "يقول الصدق"]),
          row(6, ["to sum up", "خلاصة القول", "tone of voice", "نبرة الصوت"]),
          row(7, ["flip through", "يقلب", "express regret", "يعبر عن الندم"]),
        ]),
      ]);
      const result = parser.parse(input);
      const phrases = result.items
        .filter((i): i is VocabularyStandardItemDraft => i.kind === "STANDARD_ITEM")
        .map((i) => i.word);
      expect(phrases).toContain("communicate with");
      expect(phrases).toContain("social media");
      expect(phrases).toContain("blend into");
      expect(phrases).toContain("stay in mind");
      expect(phrases).toContain("stand out");
      expect(phrases).toContain("make time");
      expect(phrases).toContain("have a look");
      expect(phrases).toContain("take time to");
      expect(phrases).toContain("tell the truth");
      expect(phrases).toContain("to sum up");
      expect(phrases).toContain("tone of voice");
      expect(phrases).toContain("flip through");
      expect(phrases).toContain("express regret");
      expect(phrases.length).toBe(14);
    });
  });

  // ─── Validation: definition and example fields ───────────────────────────

  describe("definition and example fields", () => {
    it("sets definition and example to null for standard items", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["hello", "مرحبا"]),
        ]),
      ]);
      const result = parser.parse(input);
      const stdItems = result.items.filter((i): i is VocabularyStandardItemDraft => i.kind === "STANDARD_ITEM");
      expect(stdItems[0].definition).toBeNull();
      expect(stdItems[0].example).toBeNull();
    });
  });

  // ─── Section-kind in synonym/antonym table with section-title row ────────

  describe("section kind across all variants", () => {
    it("key vocabularies produces STANDARD_VOCABULARY", () => {
      const input = doc([
        table(0, [
          row(0, ["Key vocabularies المفردات الرئيسيه"]),
          row(1, ["hello", "مرحبا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.sections[0].kind).toBe("STANDARD_VOCABULARY");
    });

    it("extra vocabularies produces STANDARD_VOCABULARY", () => {
      const input = doc([
        table(0, [
          row(0, ["Extra vocabularies المفردات الاضافيه"]),
          row(1, ["hello", "مرحبا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.sections[0].kind).toBe("STANDARD_VOCABULARY");
    });

    it("collocations produces STANDARD_VOCABULARY", () => {
      const input = doc([
        table(0, [
          row(0, ["Collocations, Prepositions & Expressionsحروف الجر والمصطلحات"]),
          row(1, ["hello", "مرحبا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.sections[0].kind).toBe("STANDARD_VOCABULARY");
    });

    it("synonym/antonym keyword in section title uses standard kind (classification drives kind, not title)", () => {
      const input = doc([
        table(0, [
          row(0, ["Synonym and antonym words"]),
          row(1, ["hello", "مرحبا"]),
        ]),
      ]);
      const result = parser.parse(input);
      // Section title "Synonym and antonym words" is not in SECTION_ALIASES,
      // but the table is 2-column standard — kind is STANDARD_VOCABULARY
      expect(result.sections.length).toBe(1);
      expect(result.sections[0].kind).toBe("STANDARD_VOCABULARY");
    });
  });
});
