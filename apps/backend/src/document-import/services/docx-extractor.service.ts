import { Injectable, BadRequestException } from "@nestjs/common";
import * as mammoth from "mammoth";
import * as cheerio from "cheerio";
import type {
  NormalizedDocument,
  NormalizedTable,
  NormalizedRow,
  NormalizedCell,
  NormalizedParagraph,
  NormalizedDocumentMetadata,
  ContentEntry,
} from "../types/normalized-document.types";
import type { CheerioAPI } from "cheerio";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TABLES = 200;
const MAX_ROWS = 1000;
const MAX_CELLS_PER_ROW = 20;
const MAX_CELL_TEXT_LENGTH = 5000;
const MAX_PARAGRAPHS = 500;
const MAX_PARAGRAPH_TEXT_LENGTH = 5000;

@Injectable()
export class DocxExtractorService {
  validateDocxFile(buffer: Buffer, originalName: string): void {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new BadRequestException("File buffer is empty or invalid");
    }

    const ext = originalName.split(".").pop()?.toLowerCase();
    if (ext !== "docx") {
      throw new BadRequestException("Only .docx files are accepted");
    }

    if (buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds the maximum allowed size of ${String(MAX_FILE_SIZE / (1024 * 1024))} MB`,
      );
    }

    if (!this.isValidZip(buffer)) {
      throw new BadRequestException("File is not a valid DOCX (invalid ZIP structure)");
    }
  }

  async extract(buffer: Buffer): Promise<NormalizedDocument> {
    const result = await mammoth.convertToHtml({ buffer });
    const html = result.value;
    const mammothWarnings = result.messages
      .filter((m) => m.type === "warning" || m.type === "error")
      .map((m) => `[${m.type}] ${m.message}`);

    const $ = cheerio.load(html);

    const tables: NormalizedTable[] = [];
    const paragraphs: NormalizedParagraph[] = [];
    const contentOrder: ContentEntry[] = [];
    let totalRows = 0;
    let paragraphIndex = 0;
    let olCounter = 0;

    // Single pass through body children preserving document order
    this.traverseBody($, $("body"), {
      tables,
      paragraphs,
      contentOrder,
      totalRowsRef: { value: totalRows },
      paragraphIndexRef: { value: paragraphIndex },
      olCounterRef: { value: olCounter },
    });

    // Fix totalRows from reference
    totalRows = this.countTotalRows(tables);

    const metadata: NormalizedDocumentMetadata = {
      totalTables: tables.length,
      totalParagraphs: paragraphs.length,
      totalRows,
      mammothWarnings: mammothWarnings.length > 0 ? mammothWarnings : undefined,
    };

    return { tables, paragraphs, contentOrder, metadata };
  }

  private traverseBody(
    $: CheerioAPI,
    parent: cheerio.Cheerio<any>,
    ctx: {
      tables: NormalizedTable[];
      paragraphs: NormalizedParagraph[];
      contentOrder: ContentEntry[];
      totalRowsRef: { value: number };
      paragraphIndexRef: { value: number };
      olCounterRef: { value: number };
    },
  ): void {
    parent.contents().each((_idx, node) => {
      if (node.type !== "tag") return;
      const el = node as any;
      const tag = el.tagName.toLowerCase();

      if (tag === "table") {
        const tableResult = this.extractTable($, el, ctx.tables.length, ctx.totalRowsRef);
        if (tableResult) {
          ctx.contentOrder.push({ kind: "table", index: ctx.tables.length });
          ctx.tables.push(tableResult);
        }
        return;
      }

      if (tag === "p" || /^h[1-6]$/.test(tag)) {
        if (ctx.paragraphIndexRef.value >= MAX_PARAGRAPHS) {
          throw new BadRequestException(
            `Document contains more than ${String(MAX_PARAGRAPHS)} top-level paragraphs`,
          );
        }
        const $el = $(el);
        const html = this.serializeParagraphHtml($, $el);
        const text = this.normalizeText($el.text());

        if (text.length > MAX_PARAGRAPH_TEXT_LENGTH) {
          throw new BadRequestException(
            `Paragraph text exceeds the maximum length of ${String(MAX_PARAGRAPH_TEXT_LENGTH)} characters`,
          );
        }

        if (text.length > 0) {
          const idx = ctx.paragraphs.length;
          const headingLevel = /^h[1-6]$/.test(tag) ? Number(tag.charAt(1)) : undefined;
          ctx.contentOrder.push({ kind: "paragraph", index: idx });
          ctx.paragraphs.push({
            paragraphIndex: idx,
            text,
            html,
            ...(headingLevel !== undefined ? { headingLevel } : {}),
          });
          ctx.paragraphIndexRef.value++;
        }
      } else if (tag === "li") {
        if (ctx.paragraphIndexRef.value >= MAX_PARAGRAPHS) {
          throw new BadRequestException(
            `Document contains more than ${String(MAX_PARAGRAPHS)} top-level paragraphs`,
          );
        }
        const $el = $(el);
        const prefix = this.getListPrefix($, el, ctx.olCounterRef);
        const html = prefix + this.serializeParagraphHtml($, $el);
        const text = prefix + this.normalizeText($el.text());

        if (text.length > MAX_PARAGRAPH_TEXT_LENGTH) {
          throw new BadRequestException(
            `Paragraph text exceeds the maximum length of ${String(MAX_PARAGRAPH_TEXT_LENGTH)} characters`,
          );
        }

        if (text.length > 0) {
          const idx = ctx.paragraphs.length;
          ctx.contentOrder.push({ kind: "paragraph", index: idx });
          ctx.paragraphs.push({ paragraphIndex: idx, text, html });
          ctx.paragraphIndexRef.value++;
        }
      } else if (["div", "body", "ul", "ol", "thead", "tbody", "section", "article", "main", "header", "footer"].includes(tag)) {
        const $childEl = $(el);
        this.traverseBody($, $childEl, ctx);
      } else if (tag === "blockquote") {
        const $el = $(el);
        const text = this.normalizeText($el.text());
        if (text.length > 0 && ctx.paragraphIndexRef.value < MAX_PARAGRAPHS) {
          const idx = ctx.paragraphs.length;
          ctx.contentOrder.push({ kind: "paragraph", index: idx });
          ctx.paragraphs.push({
            paragraphIndex: idx,
            text,
            html: this.serializeParagraphHtml($, $el),
          });
          ctx.paragraphIndexRef.value++;
        }
      }
    });
  }

  private extractTable(
    $: CheerioAPI,
    tableEl: any,
    tableIndex: number,
    totalRowsRef: { value: number },
  ): NormalizedTable | null {
    if (tableIndex >= MAX_TABLES) {
      throw new BadRequestException(
        `Document contains more than ${String(MAX_TABLES)} tables`,
      );
    }

    const rows: NormalizedRow[] = [];
    let rowIndex = 0;

    const allRowEls: any[] = [];
    $(tableEl).find("tr").each((_idx, trEl) => {
      allRowEls.push(trEl);
    });

    if (allRowEls.length === 0) return null;

    // Track rowspan placeholders
    const rowspanTracker = new Map<number, { text: string; html: string; colspan: number; remaining: number }>();

    for (const trEl of allRowEls) {
      if (totalRowsRef.value >= MAX_ROWS) {
        throw new BadRequestException(
          `Document contains more than ${String(MAX_ROWS)} total rows`,
        );
      }

      // Decrement rowspan trackers
      const activeCells: { text: string; html: string; colspan: number; colIndex: number }[] = [];
      for (const [colIdx, span] of rowspanTracker.entries()) {
        if (span.remaining > 0) {
          activeCells.push({
            text: span.text,
            html: span.html,
            colspan: span.colspan,
            colIndex: colIdx,
          });
          span.remaining--;
          if (span.remaining <= 0) {
            rowspanTracker.delete(colIdx);
          }
        } else {
          rowspanTracker.delete(colIdx);
        }
      }

      const cells: NormalizedCell[] = [];
      let columnIndex = 0;

      // Place active rowspan cells first
      activeCells.sort((a, b) => a.colIndex - b.colIndex);
      for (const ac of activeCells) {
        while (cells.some((c) => c.columnIndex === columnIndex)) {
          columnIndex++;
        }
        cells.push({
          columnIndex: ac.colIndex,
          text: ac.text,
          html: ac.html,
          colspan: ac.colspan > 1 ? ac.colspan : undefined,
        });
        columnIndex = ac.colIndex + ac.colspan;
      }

      $(trEl).find("td, th").each((_cellElIdx, cellEl) => {
        const $cell = $(cellEl);
        const colspan = Math.min(parseInt($cell.attr("colspan") ?? "1", 10) || 1, 8);
        const rowspan = Math.min(parseInt($cell.attr("rowspan") ?? "1", 10) || 1, 8);

        const innerHtml = this.serializeCellHtml($, $cell);
        const cellText = this.normalizeText($cell.text());

        if (cellText.length > MAX_CELL_TEXT_LENGTH) {
          throw new BadRequestException(
            `Cell text exceeds the maximum length of ${String(MAX_CELL_TEXT_LENGTH)} characters`,
          );
        }

        // Find next available column index
        while (cells.some((c) => c.columnIndex === columnIndex || (columnIndex >= c.columnIndex && columnIndex < c.columnIndex + (c.colspan ?? 1)))) {
          columnIndex++;
        }

        if (columnIndex >= MAX_CELLS_PER_ROW) {
          throw new BadRequestException(
            `Row contains more than ${String(MAX_CELLS_PER_ROW)} cells`,
          );
        }

        if (rowspan > 1) {
          rowspanTracker.set(columnIndex, {
            text: cellText,
            html: innerHtml,
            colspan,
            remaining: rowspan - 1,
          });
        }

        cells.push({
          columnIndex,
          text: cellText,
          html: innerHtml,
          colspan: colspan > 1 ? colspan : undefined,
          rowspan: rowspan > 1 ? rowspan : undefined,
        });

        columnIndex += colspan;
      });

      if (cells.length > 0) {
        rows.push({ rowIndex, cells });
        rowIndex += 1;
        totalRowsRef.value += 1;
      }
    }

    return rows.length > 0 ? { tableIndex, rows } : null;
  }

  private getListPrefix($: CheerioAPI, liEl: any, olCounterRef?: { value: number }): string {
    const parent = $(liEl).parent();
    if (!parent.length) return "";
    const parentTag = parent[0].tagName.toLowerCase();
    if (parentTag === "ol") {
      // Use a global counter so separate <ol> blocks with single <li> are numbered sequentially (1., 2., 3., ...)
      if (olCounterRef) {
        olCounterRef.value += 1;
        return `${String(olCounterRef.value)}. `;
      }
      const liIdx = parent.children("li").toArray().indexOf(liEl);
      return `${String(liIdx + 1)}. `;
    }
    return "• ";
  }

  private serializeParagraphHtml($: CheerioAPI, $el: cheerio.Cheerio<any>): string {
    let html = "";
    $el.contents().each((_idx, node) => {
      if (node.type === "text") {
        html += node.data ?? "";
      } else if (node.type === "tag") {
        const el = node as any;
        const tag = el.tagName.toLowerCase();
        if (["strong", "b", "em", "i", "u", "span", "a", "br", "sub", "sup", "code", "abbr", "mark"].includes(tag)) {
          if (tag === "br") {
            html += "<br/>";
          } else {
            html += `<${tag}>${$(el).html() ?? ""}</${tag}>`;
          }
        } else {
          html += $(el).text() ?? "";
        }
      }
    });
    return html;
  }

  private serializeCellHtml($: CheerioAPI, $el: cheerio.Cheerio<any>): string {
    let html = "";
    $el.contents().each((_idx, node) => {
      if (node.type === "text") {
        html += node.data ?? "";
      } else if (node.type === "tag") {
        const el = node as any;
        const tag = el.tagName.toLowerCase();
        if (["strong", "b", "em", "i", "u", "span", "a", "br", "sub", "sup", "code", "abbr", "mark", "p"].includes(tag)) {
          if (tag === "br") {
            html += "<br/>";
          } else {
            html += `<${tag}>${$(el).html() ?? ""}</${tag}>`;
          }
        } else {
          html += $(el).text() ?? "";
        }
      }
    });
    return html;
  }

  private normalizeText(text: string): string {
    return text
      .replace(/\r\n/g, " ")
      .replace(/\r/g, " ")
      .replace(/\n/g, " ")
      .replace(/\t/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private countTotalRows(tables: NormalizedTable[]): number {
    return tables.reduce((sum, t) => sum + t.rows.length, 0);
  }

  private isValidZip(buffer: Buffer): boolean {
    if (buffer.length < 22) return false;

    // Local file header signature: PK\x03\x04
    if (
      buffer[0] !== 0x50 || buffer[1] !== 0x4b ||
      buffer[2] !== 0x03 || buffer[3] !== 0x04
    ) {
      return false;
    }

    // Search for End of Central Directory signature: PK\x05\x06
    const eocdSearchStart = Math.max(0, buffer.length - 65557);
    let eocdPos = -1;
    for (let i = buffer.length - 22; i >= eocdSearchStart; i--) {
      if (
        buffer[i] === 0x50 && buffer[i + 1] === 0x4b &&
        buffer[i + 2] === 0x05 && buffer[i + 3] === 0x06
      ) {
        eocdPos = i;
        break;
      }
    }
    if (eocdPos < 0) return false;

    // Read total number of entries from EOCD (offset 8, 2 bytes LE)
    const numEntries = buffer.readUInt16LE(eocdPos + 8);
    if (numEntries === 0) return false;

    // Read central directory offset from EOCD (offset 16, 4 bytes LE)
    const cdOffset = buffer.readUInt32LE(eocdPos + 16);
    if (cdOffset + 4 > buffer.length) return false;

    // Verify central directory header signature: PK\x01\x02
    if (
      buffer[cdOffset] !== 0x50 || buffer[cdOffset + 1] !== 0x4b ||
      buffer[cdOffset + 2] !== 0x01 || buffer[cdOffset + 3] !== 0x02
    ) {
      return false;
    }

    return true;
  }
}
