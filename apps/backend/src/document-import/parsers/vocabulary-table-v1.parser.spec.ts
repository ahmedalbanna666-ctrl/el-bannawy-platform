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
          row(0, ["learn", "يتعلم"]),
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
          row(0, ["a (n)", "أ", "b (n)", "ب"]),
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
          row(0, ["parade (n)", "عرض"]),
          row(1, ["bury (v)", "يدفن"]),
          row(2, ["royal (adj)", "ملكي"]),
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
          row(0, ["hello", "مرحبا"]),
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
          row(0, ["Hello", "مرحبا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].word).toBe("Hello");
    });

    it("preserves Arabic translation", () => {
      const input = doc([
        table(0, [
          row(0, ["learn", "يتعلم"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].translation).toBe("يتعلم");
    });

    it("preserves mixed Unicode", () => {
      const input = doc([
        table(0, [
          row(0, ["café (n)", "قهوة ☕"]),
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
          row(0, ["hello", ""]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].status).toBe("INVALID");
      expect(result.items[0].errors).toContain("MISSING_TRANSLATION");
    });

    it("marks missing word as INVALID", () => {
      const input = doc([
        table(0, [
          row(0, ["", "مرحبا"]),
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
          row(0, ["hello", "مرحبا"]),
          row(1, ["hello", "اهلا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].status).toBe("VALID");
      expect(result.items[1].status).toBe("WARNING");
      expect(result.items[1].warnings).toContain("DUPLICATE_IN_DOCUMENT");
    });

    it("comparison is case-insensitive", () => {
      const input = doc([
        table(0, [
          row(0, ["Hello", "مرحبا"]),
          row(1, ["hello", "اهلا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[1].warnings).toContain("DUPLICATE_IN_DOCUMENT");
    });

    it("comparison normalizes whitespace", () => {
      const input = doc([
        table(0, [
          row(0, ["look after", "يعتني"]),
          row(1, ["look  after", "يهتم"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[1].warnings).toContain("DUPLICATE_IN_DOCUMENT");
    });

    it("first occurrence remains VALID, later becomes WARNING", () => {
      const input = doc([
        table(0, [
          row(0, ["hello", "مرحبا"]),
          row(1, ["world", "عالم"]),
          row(2, ["hello", "اهلا"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items[0].status).toBe("VALID");
      expect(result.items[2].status).toBe("WARNING");
    });
  });

  describe("unsupported table layouts", () => {
    it("warns on 3-column table", () => {
      const input = doc([
        table(0, [
          row(0, ["a", "b", "c"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(0);
      expect(result.warnings.some((w) => w.includes("unsupported"))).toBe(true);
    });

    it("warns on 5-column table", () => {
      const input = doc([
        table(0, [
          row(0, ["a", "b", "c", "d", "e"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(0);
      expect(result.warnings.some((w) => w.includes("unsupported"))).toBe(true);
    });

    it("warns on inconsistent row widths", () => {
      const input = doc([
        table(0, [
          row(0, ["a", "b"]),
          row(1, ["a", "b", "c"]),
        ]),
      ]);
      const result = parser.parse(input);
      expect(result.items.length).toBe(0);
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
      const rows: NormalizedRow[] = [];
      for (let i = 0; i < 510; i++) {
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
        table(0, [row(0, ["hello", "مرحبا"])]),
        table(1, [row(0, ["world", "عالم"])]),
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
          row(0, ["a (n)", "أ", "b (n)", "ب"]),
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
          row(0, ["hello", "مرحبا"]),
          row(1, ["hello", "اهلا"]),
          row(2, ["", "x"]),
          row(3, ["y", ""]),
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
          row(0, ["a", "أ"]),
          row(1, ["b", "ب"]),
          row(2, ["c", "ت"]),
        ]),
      ]);
      const result = parser.parse(input);
      const ids = result.items.map((i) => i.clientDraftId);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("generates non-empty UUID strings", () => {
      const input = doc([table(0, [row(0, ["hello", "مرحبا"])])]);
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
});
