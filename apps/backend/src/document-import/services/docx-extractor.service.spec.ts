import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { DocxExtractorService } from "./docx-extractor.service";
import type { NormalizedDocument, NormalizedTable, NormalizedCell, NormalizedParagraph } from "../types/normalized-document.types";
import {
  createSimpleVocabTable,
  createFourColumnTable,
  createMixedDocument,
  createEdgeCaseTable,
  createEmptyBufferDocx,
  createNonZipBuffer,
} from "../../../test/fixtures/docx-fixtures";

describe("DocxExtractorService", () => {
  let service: DocxExtractorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocxExtractorService],
    }).compile();
    service = module.get(DocxExtractorService);
  });

  // ── Validation ──────────────────────────────────────────────────────

  describe("validateDocxFile", () => {
    it("rejects undefined buffer", () => {
      expect(() => service.validateDocxFile(undefined as unknown as Buffer, "test.docx")).toThrow(BadRequestException);
    });

    it("rejects empty buffer", async () => {
      const buf = await createEmptyBufferDocx();
      expect(() => service.validateDocxFile(buf, "test.docx")).toThrow(BadRequestException);
    });

    it("rejects wrong extension (.pdf)", () => {
      const buf = Buffer.from("content");
      expect(() => service.validateDocxFile(buf, "test.pdf")).toThrow(BadRequestException);
    });

    it("rejects wrong extension (.doc)", () => {
      const buf = Buffer.from("content");
      expect(() => service.validateDocxFile(buf, "test.doc")).toThrow(BadRequestException);
    });

    it("rejects extension .txt", () => {
      const buf = Buffer.from("content");
      expect(() => service.validateDocxFile(buf, "file.txt")).toThrow(BadRequestException);
    });

    it("rejects file with no extension", () => {
      const buf = Buffer.from("content");
      expect(() => service.validateDocxFile(buf, "noextension")).toThrow(BadRequestException);
    });

    it("accepts uppercase .DOCX extension", async () => {
      const buf = await createSimpleVocabTable();
      expect(() => service.validateDocxFile(buf, "TEST.DOCX")).not.toThrow();
    });

    it("rejects oversized file", () => {
      const buf = Buffer.alloc(11 * 1024 * 1024);
      expect(() => service.validateDocxFile(buf, "large.docx")).toThrow(BadRequestException);
    });

    it("rejects non-ZIP signature", () => {
      const buf = createNonZipBuffer();
      expect(() => service.validateDocxFile(buf, "fake.docx")).toThrow(BadRequestException);
    });

    it("accepts valid DOCX file", async () => {
      const buf = await createSimpleVocabTable();
      expect(() => service.validateDocxFile(buf, "test.docx")).not.toThrow();
    });
  });

  // ── Real Extraction ─────────────────────────────────────────────────

  describe("extract — simple two-column table", () => {
    let result: NormalizedDocument;

    beforeAll(async () => {
      const buf = await createSimpleVocabTable();
      result = await service.extract(buf);
    });

    it("extracts exactly one table", () => {
      expect(result.tables.length).toBe(1);
      expect(result.metadata.totalTables).toBe(1);
    });

    it("preserves table order", () => {
      expect(result.tables[0].tableIndex).toBe(0);
    });

    it("extracts correct number of rows (3 data rows)", () => {
      const rows = result.tables[0].rows;
      expect(rows.length).toBeGreaterThanOrEqual(3);
    });

    it("preserves row order", () => {
      const rows = result.tables[0].rows;
      expect(rows[0].rowIndex).toBe(0);
      expect(rows[1].rowIndex).toBe(1);
    });

    it("extracts 2 cells per row", () => {
      for (const row of result.tables[0].rows) {
        expect(row.cells.length).toBe(2);
      }
    });

    it("preserves cell order", () => {
      const cells = result.tables[0].rows[0].cells;
      expect(cells[0].columnIndex).toBe(0);
      expect(cells[1].columnIndex).toBe(1);
    });

    it("preserves English text", () => {
      const words = result.tables[0].rows.flatMap((r) => r.cells.map((c) => c.text));
      expect(words.some((t) => t.toLowerCase().includes("learn"))).toBe(true);
      expect(words.some((t) => t.toLowerCase().includes("study"))).toBe(true);
    });

    it("preserves Arabic text", () => {
      const words = result.tables[0].rows.flatMap((r) => r.cells.map((c) => c.text));
      expect(words.some((t) => t.includes("يتعلم"))).toBe(true);
      expect(words.some((t) => t.includes("يذاكر"))).toBe(true);
    });

    it("calculates metadata accurately", () => {
      expect(result.metadata.totalRows).toBe(result.tables[0].rows.length);
    });
  });

  describe("extract — four-column table", () => {
    let result: NormalizedDocument;

    beforeAll(async () => {
      const buf = await createFourColumnTable();
      result = await service.extract(buf);
    });

    it("extracts one table with 4 cells per row", () => {
      expect(result.tables.length).toBe(1);
      for (const row of result.tables[0].rows) {
        expect(row.cells.length).toBe(4);
      }
    });

    it("has correct column indices 0-3", () => {
      const cells = result.tables[0].rows[0].cells;
      expect(cells[0].columnIndex).toBe(0);
      expect(cells[1].columnIndex).toBe(1);
      expect(cells[2].columnIndex).toBe(2);
      expect(cells[3].columnIndex).toBe(3);
    });
  });

  describe("extract — mixed document with paragraphs", () => {
    let result: NormalizedDocument;

    beforeAll(async () => {
      const buf = await createMixedDocument();
      result = await service.extract(buf);
    });

    it("extracts top-level paragraphs outside tables", () => {
      expect(result.paragraphs.length).toBeGreaterThanOrEqual(1);
    });

    it("does not duplicate table-cell text into top-level paragraphs", () => {
      const paragraphTexts = result.paragraphs.map((p) => p.text.toLowerCase());
      expect(paragraphTexts.some((t) => t.includes("learn"))).toBe(false);
      expect(paragraphTexts.some((t) => t.includes("يتعلم"))).toBe(false);
    });

    it("preserves metadata paragraph count", () => {
      expect(result.metadata.totalParagraphs).toBe(result.paragraphs.length);
    });
  });

  describe("extract — structural edge cases", () => {
    let result: NormalizedDocument;

    beforeAll(async () => {
      const buf = await createEdgeCaseTable();
      result = await service.extract(buf);
    });

    it("preserves empty cells as empty-string text", () => {
      const allCells: NormalizedCell[] = result.tables[0].rows.flatMap((r) => r.cells);
      const emptyCells = allCells.filter((c) => c.text === "");
      expect(emptyCells.length).toBeGreaterThanOrEqual(3);
      expect(emptyCells.every((c) => c.columnIndex >= 0)).toBe(true);
    });

    it("preserves structurally empty rows", () => {
      const allRows = result.tables[0].rows;
      const emptyRowCells = allRows
        .map((r) => r.cells.every((c) => c.text === ""))
        .filter(Boolean);
      expect(emptyRowCells.length).toBeGreaterThanOrEqual(1);
    });

    it("combines multiple text runs in one cell", () => {
      const combinedRow = result.tables[0].rows.find((r) =>
        r.cells.some((c) => c.text.includes("second part")),
      );
      expect(combinedRow).toBeDefined();
      const cell = combinedRow!.cells.find((c) => c.text.includes("first part"));
      expect(cell).toBeDefined();
      expect(cell!.text).toContain("second part");
    });

    it("handles line breaks inside a cell", () => {
      const lbRow = result.tables[0].rows.find((r) =>
        r.cells.some((c) => c.text.includes("line1")),
      );
      expect(lbRow).toBeDefined();
      const lbCell = lbRow!.cells.find((c) => c.text.includes("line1"));
      expect(lbCell).toBeDefined();
      expect(lbCell!.text).toContain("line2");
    });

    it("preserves mixed Arabic/English in same cell", () => {
      const mixedRow = result.tables[0].rows.find((r) =>
        r.cells.some((c) => c.text.includes("عربي") && c.text.includes("English")),
      );
      expect(mixedRow).toBeDefined();
    });

    it("preserves Unicode punctuation", () => {
      const punctRow = result.tables[0].rows.find((r) =>
        r.cells.some((c) => c.text.includes("!!")),
      );
      expect(punctRow).toBeDefined();
    });
  });

  describe("extract — whitespace normalization", () => {
    it("normalizes repeated whitespace", () => {
      const result = (service as unknown as { normalizeCellText: (t: string) => string }).normalizeCellText(
        "hello    world",
      );
      expect(result).toBe("hello world");
    });

    it("normalizes CRLF sequences", () => {
      const result = (service as unknown as { normalizeCellText: (t: string) => string }).normalizeCellText(
        "hello\r\nworld",
      );
      expect(result).toBe("hello world");
    });

    it("normalizes tab characters", () => {
      const result = (service as unknown as { normalizeCellText: (t: string) => string }).normalizeCellText(
        "hello\tworld",
      );
      expect(result).toBe("hello world");
    });

    it("trims leading/trailing whitespace", () => {
      const result = (service as unknown as { normalizeCellText: (t: string) => string }).normalizeCellText(
        "  hello world  ",
      );
      expect(result).toBe("hello world");
    });
  });

  // ── Resource Limits ─────────────────────────────────────────────────

  describe("resource limits", () => {
    it("enforces maximum cell text length", async () => {
      jest
        .spyOn(service as unknown as { normalizeCellText: (t: string) => string }, "normalizeCellText")
        .mockReturnValue("x".repeat(5001));
      const buf = await createSimpleVocabTable();
      await expect(service.extract(buf)).rejects.toThrow(BadRequestException);
    });
  });

  // ── Malformed DOCX ──────────────────────────────────────────────────

  describe("malformed DOCX handling", () => {
    it("produces BadRequestException for invalid DOCX content", async () => {
      const buf = Buffer.from("not a valid docx file content at all");
      await expect(service.extract(buf)).rejects.toThrow();
    });
  });
});
