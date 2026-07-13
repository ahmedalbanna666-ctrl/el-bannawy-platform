import { VocabularyTableV1Parser } from "./vocabulary-table-v1.parser";
import type { NormalizedDocument, NormalizedTable, NormalizedRow } from "../types/normalized-document.types";
import type { VocabularyImportPreview, VocabularyPreviewItem } from "../types/vocabulary-preview.types";

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

describe("VocabularyTableV1Parser", () => {
  let parser: VocabularyTableV1Parser;

  beforeEach(() => {
    parser = new VocabularyTableV1Parser();
  });

  describe("header detection", () => {
    it("skips English header row in 2-column table", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "Meaning"]),
          row(1, ["learn", "يتعلم"]),
          row(2, ["study", "يذاكر"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(2);
      expect(result.items[0].word).toBe("learn");
    });

    it("skips Arabic header row in 2-column table", () => {
      const input = doc([
        table(0, [
          row(0, ["الكلمة", "المعنى"]),
          row(1, ["learn", "يتعلم"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(1);
      expect(result.items[0].word).toBe("learn");
    });

    it("works with no header row", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["learn", "يتعلم"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(1);
      expect(result.items[0].word).toBe("learn");
    });
  });

  describe("four-column tables", () => {
    it("parses pairs from 4-column table with English headers", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "Meaning", "Word", "Meaning"]),
          row(1, ["learn (v)", "يتعلم", "write (v)", "يكتب"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(2);
      expect(result.items[0].word).toBe("learn");
      expect(result.items[0].sourcePairIndex).toBe(0);
      expect(result.items[1].word).toBe("write");
      expect(result.items[1].sourcePairIndex).toBe(1);
    });

    it("parses pairs from 4-column table with Arabic headers", () => {
      const input = doc([
        table(0, [
          row(0, ["الكلمة", "المعنى", "الكلمة", "المعنى"]),
          row(1, ["hello", "مرحبا", "bye", "وداعا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(2);
    });

    it("emits pair 1 before pair 2 in same row", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["a (n)", "أ", "b (n)", "ب"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].displayOrder).toBeLessThan(result.items[1].displayOrder);
      expect(result.items[0].sourcePairIndex).toBe(0);
      expect(result.items[1].sourcePairIndex).toBe(1);
    });
  });

  describe("multiple tables", () => {
    it("preserves source order across multiple tables", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "Meaning"]),
          row(1, ["hello", "مرحبا"]),
        ]),
        table(1, [
          row(0, ["Word", "Meaning"]),
          row(1, ["world", "عالم"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(2);
      expect(result.items[0].displayOrder).toBe(0);
      expect(result.items[1].displayOrder).toBe(1);
      expect(result.items[0].sourceTableIndex).toBe(0);
      expect(result.items[1].sourceTableIndex).toBe(1);
    });
  });

  describe("POS extraction", () => {
    it("extracts part of speech from word cell", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["parade (n)", "عرض"]),
          row(2, ["bury (v)", "يدفن"]),
          row(3, ["royal (adj)", "ملكي"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].partOfSpeech).toBe("n");
      expect(result.items[1].partOfSpeech).toBe("v");
      expect(result.items[2].partOfSpeech).toBe("adj");
    });

    it("returns null for words without POS", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["hello", "مرحبا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].partOfSpeech).toBeNull();
    });
  });

  describe("text preservation", () => {
    it("preserves English word casing", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["Hello", "مرحبا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].word).toBe("Hello");
    });

    it("preserves Arabic translation", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["learn", "يتعلم"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].translation).toBe("يتعلم");
    });

    it("preserves mixed Unicode", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["café (n)", "قهوة ☕"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].word).toBe("café");
      expect(result.items[0].translation).toBe("قهوة ☕");
    });
  });

  describe("invalid row classification", () => {
    it("marks missing translation as INVALID", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["hello", ""]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].status).toBe("INVALID");
      expect(result.items[0].errors).toContain("MISSING_TRANSLATION");
    });

    it("marks missing word as INVALID", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["", "مرحبا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].status).toBe("INVALID");
      expect(result.items[0].errors).toContain("MISSING_WORD");
    });

    it("skips both-empty rows", () => {
      const input = doc([
        table(0, [
          row(0, ["", ""]),
          row(1, ["hello", "مرحبا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(1);
      expect(result.items[0].word).toBe("hello");
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

  describe("duplicate detection", () => {
    it("detects duplicate words in same document", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["hello", "مرحبا"]),
          row(2, ["hello", "اهلا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(2);
      expect(result.items[0].status).toBe("VALID");
      expect(result.items[1].status).toBe("WARNING");
      expect(result.items[1].warnings).toContain("DUPLICATE_IN_DOCUMENT");
    });

    it("comparison is case-insensitive", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["Hello", "مرحبا"]),
          row(2, ["hello", "اهلا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[1].warnings).toContain("DUPLICATE_IN_DOCUMENT");
    });

    it("comparison normalizes whitespace", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["look after", "يعتني"]),
          row(2, ["look  after", "يهتم"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[1].warnings).toContain("DUPLICATE_IN_DOCUMENT");
    });

    it("first occurrence remains VALID, later becomes WARNING", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["hello", "مرحبا"]),
          row(2, ["world", "عالم"]),
          row(3, ["hello", "اهلا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(3);
      expect(result.items[0].status).toBe("VALID");
      expect(result.items[2].status).toBe("WARNING");
    });
  });

  describe("unsupported table layouts", () => {
    it("warns on 3-column table", () => {
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

    it("warns on 5-column table", () => {
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

    it("processes mixed row widths per-row — valid rows are not discarded", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["hello", "مرحبا"]),
          row(2, ["x", "y", "z"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(1);
      expect(result.items[0].word).toBe("hello");
      expect(result.warnings.some((w) => w.includes("unsupported"))).toBe(true);
    });
  });

  describe("empty document", () => {
    it("returns zero items with warning for empty document", () => {
      const input = doc([]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(0);
      expect(result.counts.total).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

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
  });

  describe("source coordinates", () => {
    it("records correct sourceTableIndex", () => {
      const input = doc([
        table(0, [row(0, [""]), row(1, ["hello", "مرحبا"])]),
        table(1, [row(0, [""]), row(1, ["world", "عالم"])]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].sourceTableIndex).toBe(0);
      expect(result.items[1].sourceTableIndex).toBe(1);
    });

    it("records correct sourceRowIndex", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "Meaning"]),
          row(1, ["hello", "مرحبا"]),
          row(2, ["world", "عالم"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].sourceRowIndex).toBe(1);
      expect(result.items[1].sourceRowIndex).toBe(2);
    });

    it("records correct sourcePairIndex", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["a (n)", "أ", "b (n)", "ب"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].sourcePairIndex).toBe(0);
      expect(result.items[1].sourcePairIndex).toBe(1);
    });
  });

  describe("display order", () => {
    it("is deterministic and sequential", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "Meaning"]),
          row(1, ["a", "أ"]),
          row(2, ["b", "ب"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(2);
      expect(result.items[0].displayOrder).toBe(0);
      expect(result.items[1].displayOrder).toBe(1);
    });
  });

  describe("counts", () => {
    it("computes total, valid, warning, invalid counts", () => {
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
  });

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

    it("generates non-empty UUID strings", () => {
      const input = doc([table(0, [row(0, [""]), row(1, ["hello", "مرحبا"])])]);
      const result = parser.parse(input);
      expect(result.items[0].clientDraftId).toBeTruthy();
      expect(typeof result.items[0].clientDraftId).toBe("string");
      expect(result.items[0].clientDraftId.length).toBeGreaterThan(20);
    });
  });

  describe("parserProfile", () => {
    it("returns exact parserProfile value", () => {
      const input = doc([]);
      const result = parser.parse(input);
      expect(result.parserProfile).toBe("VOCABULARY_TABLE_V1");
    });
  });

  describe("section title row handling", () => {
    it("single-cell Key vocabularies section row does not reject table", () => {
      const input = doc([
        table(0, [
          row(0, ["Key vocabularies المفردات الرئيسيه"]),
          row(1, ["hello", "مرحبا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(1);
      expect(result.items[0].word).toBe("hello");
    });

    it("bilingual Extra vocabularies section row does not reject table", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["communicate", "يتواصل"]),
          row(2, ["Extra vocabularies المفردات الاضافيه"]),
          row(3, ["text", "نص"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(2);
    });

    it("Collocations/Prepositions/Expressions section row does not reject table", () => {
      const input = doc([
        table(0, [
          row(0, ["Collocations, Prepositions & Expressionsحروف الجر والمصطلحات"]),
          row(1, ["make time", "يخصص وقت", "have a look", "يلقي نظرة"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(2);
    });

    it("section title row does not produce a draft", () => {
      const input = doc([
        table(0, [
          row(0, ["Extra vocabularies المفردات الاضافيه"]),
          row(1, ["hello", "مرحبا"]),
        ]),
      ]);
      const result = parser.parse(input);
      const titleDraft = result.items.find((i) => i.word.includes("Extra"));
      expect(titleDraft).toBeUndefined();
    });

    it("section title row does not consume displayOrder", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["a", "أ"]),
          row(2, ["Extra vocabularies المفردات الاضافيه"]),
          row(3, ["b", "ب"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].displayOrder).toBe(0);
      expect(result.items[1].displayOrder).toBe(1);
      expect(result.items[0].word).toBe("a");
      expect(result.items[1].word).toBe("b");
    });

    it("mixed 1-cell section row + 4-cell data rows imports all valid pairs", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["a (n)", "أ", "b (n)", "ب"]),
          row(2, ["Extra vocabularies المفردات الاضافيه"]),
          row(3, ["c (n)", "ت", "d (n)", "ث"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(4);
      expect(result.items[0].word).toBe("a");
      expect(result.items[2].word).toBe("c");
    });

    it("mixed 1-cell section row + 2-cell data rows imports all valid pairs", () => {
      const input = doc([
        table(0, [
          row(0, ["Key vocabularies المفردات الرئيسيه"]),
          row(1, ["hello", "مرحبا"]),
          row(2, ["world", "عالم"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(2);
    });
  });

  describe("6-cell synonym/antonym table", () => {
    it("6-cell Word/Synonym/Antonym header is detected and skipped", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(1);
      expect(result.items[0].word).toBe("care");
      expect(result.items[0].translation).toBe("يهتم");
    });

    it("6-cell data row imports only primary word + primary Arabic meaning", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["stay in touch", "يظل على اتصال", "keep in touch", "يبقى على اتصال", "lose touch with", "يفقد التواصل"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(1);
      expect(result.items[0].word).toBe("stay in touch");
      expect(result.items[0].translation).toBe("يظل على اتصال");
    });

    it("synonym is NOT emitted as canonical vocabulary", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
      ]);
      const result = parser.parse(input);
      const words = result.items.map((i) => i.word);
      expect(words).not.toContain("concern");
      expect(words).not.toContain("ignore");
    });

    it("antonym is NOT emitted as canonical vocabulary", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["polite", "مهذب", "", "", "rude", "وقح"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(1);
      expect(result.items[0].word).toBe("polite");
    });

    it("ignored synonym/antonym warning is returned", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
      ]);
      const result = parser.parse(input);
      const hasSynAntWarning = result.warnings.some(
        (w) => w.includes("Synonym") && w.includes("antonym"),
      );
      expect(hasSynAntWarning).toBe(true);
    });

    it("concatenation in ignored synonym cell does not block valid primary import", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "يهتم", "concernregard", "اهتماماعتبار", "ignore", "يتجاهل"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(1);
      expect(result.items[0].word).toBe("care");
      expect(result.items[0].translation).toBe("يهتم");
      expect(result.items[0].status).toBe("VALID");
    });

    it("concatenation in ignored antonym cell does not block valid primary import", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "يهتم", "concern", "اهتمام", "ignorerude", "يتجاهلوقح"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(1);
      expect(result.items[0].status).toBe("VALID");
    });

    it("primary word with empty translation is INVALID — not guessed", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["conflict", "", "disagreement", "خلاف", "agreement", "اتفاق"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(1);
      expect(result.items[0].word).toBe("conflict");
      expect(result.items[0].status).toBe("INVALID");
      expect(result.items[0].errors).toContain("MISSING_TRANSLATION");
    });

    it("merged Arabic in primary translation preserved raw — no guessing applied", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["conflict", "خلافصراع", "disagreement", "خلاف", "agreement", "اتفاق"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(1);
      expect(result.items[0].word).toBe("conflict");
      expect(result.items[0].translation).toBe("خلافصراع");
      expect(result.items[0].status).toBe("VALID");
    });
  });

  describe("display order across mixed layouts", () => {
    it("stable displayOrder across multiple tables and mixed row layouts", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["a", "أ", "b", "ب"]),
          row(2, ["Extra vocabularies المفردات الاضافيه"]),
          row(3, ["c", "ت", "d", "ث"]),
        ]),
        table(1, [
          row(0, ["Collocations, Prepositions & Expressionsحروف الجر والمصطلحات"]),
          row(1, ["e", "ج"]),
        ]),
        table(2, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["f", "ح"]),
        ]),
      ]);
      const result = parser.parse(input);
      const orders = result.items.map((i) => ({ word: i.word, order: i.displayOrder }));
      expect(orders).toEqual([
        { word: "a", order: 0 },
        { word: "b", order: 1 },
        { word: "c", order: 2 },
        { word: "d", order: 3 },
        { word: "e", order: 4 },
        { word: "f", order: 5 },
      ]);
    });
  });

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
      const phrases = result.items.map((i) => i.word);
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
      expect(result.items.length).toBe(14);
    });
  });

  describe("semantic table classifier", () => {
    it("A: SYNONYM_ANTONYM as first table — detected semantically", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(1);
      expect(result.items[0].word).toBe("care");
      expect(result.warnings.some((w) => w.includes("Synonym"))).toBe(true);
    });

    it("B: SYNONYM_ANTONYM in middle — standard tables before and after still skip row 0", () => {
      const input = doc([
        table(0, [
          row(0, ["Key vocabularies المفردات الرئيسيه"]),
          row(1, ["hello", "مرحبا"]),
        ]),
        table(1, [
          row(0, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(1, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
        table(2, [
          row(0, ["Extra vocabularies المفردات الاضافيه"]),
          row(1, ["world", "عالم"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(3);
      expect(result.items[0].word).toBe("hello");
      expect(result.items[0].sourceTableIndex).toBe(0);
      expect(result.items[1].word).toBe("care");
      expect(result.items[1].sourceTableIndex).toBe(1);
      expect(result.items[2].word).toBe("world");
      expect(result.items[2].sourceTableIndex).toBe(2);
    });

    it("C: SYNONYM_ANTONYM as final table — detected semantically", () => {
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
      expect(result.items.length).toBe(2);
      expect(result.items[0].word).toBe("hello");
      expect(result.items[1].word).toBe("care");
    });

    it("D: No SYNONYM_ANTONYM table — all standard tables work normally", () => {
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
      expect(result.items.length).toBe(2);
      expect(result.warnings.some((w) => w.includes("Synonym"))).toBe(false);
    });

    it("E: More than one SYNONYM_ANTONYM table — each detected with independent warning", () => {
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
      expect(result.items.length).toBe(2);
      expect(result.items[0].word).toBe("care");
      expect(result.items[1].word).toBe("polite");
      const synAntWarnings = result.warnings.filter((w) => w.includes("Synonym"));
      expect(synAntWarnings.length).toBe(2);
    });

    it("F: 6-cell non-synonym table — NOT classified as SYNONYM_ANTONYM", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["a", "b", "c", "d", "e", "f"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(0);
      expect(result.warnings.some((w) => w.includes("unsupported"))).toBe(true);
      expect(result.warnings.some((w) => w.includes("Synonym"))).toBe(false);
    });

    it("G: Table containing only Synonym — NOT classified as SYNONYM_ANTONYM", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["Synonym"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(0);
      expect(result.warnings.some((w) => w.includes("Synonym"))).toBe(false);
    });

    it("H: Word + Synonym but no Antonym — NOT classified as SYNONYM_ANTONYM", () => {
      const input = doc([
        table(0, [
          row(0, [""]),
          row(1, ["Word", "الكلمة", "Synonym", "المرادف"]),
          row(2, ["hello", "مرحبا", "hi", "اهلا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.warnings.some((w) => w.includes("Synonym"))).toBe(false);
      expect(result.items.length).toBeGreaterThanOrEqual(0);
    });

    it("I: Arabic-only semantic header classified as SYNONYM_ANTONYM", () => {
      const input = doc([
        table(0, [
          row(0, ["الكلمة", "المرادف", "المضاد"]),
          row(1, ["word1", "syn1", "ant1"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.warnings.some((w) => w.includes("Synonym"))).toBe(true);
    });

    it("J: Mixed-language semantic header classified correctly", () => {
      const input = doc([
        table(0, [
          row(0, ["Word", "المعنى", "مرادف", "الترجمة", "Antonym", "المعنى"]),
          row(1, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(1);
      expect(result.items[0].word).toBe("care");
      expect(result.warnings.some((w) => w.includes("Synonym"))).toBe(true);
    });

    it("K: Semantic header after section-title row — found within bounded scan", () => {
      const input = doc([
        table(0, [
          row(0, ["Key vocabularies المفردات الرئيسيه"]),
          row(1, ["Word", "الكلمة", "Synonym", "المرادف", "Antonym", "المضاد"]),
          row(2, ["care", "يهتم", "concern", "اهتمام", "ignore", "يتجاهل"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(1);
      expect(result.items[0].word).toBe("care");
      expect(result.warnings.some((w) => w.includes("Synonym"))).toBe(true);
    });
  });
});
