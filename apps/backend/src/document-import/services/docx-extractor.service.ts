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
} from "../types/normalized-document.types";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TABLES = 20;
const MAX_ROWS = 1000;
const MAX_CELLS_PER_ROW = 20;
const MAX_CELL_TEXT_LENGTH = 5000;
const MAX_PARAGRAPHS = 500;
const MAX_PARAGRAPH_TEXT_LENGTH = 5000;

const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

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
      throw new BadRequestException("File is not a valid DOCX (invalid ZIP signature)");
    }
  }

  async extract(buffer: Buffer): Promise<NormalizedDocument> {
    const result = await mammoth.convertToHtml({ buffer });
    const html = result.value;
    const $ = cheerio.load(html);

    const tables: NormalizedTable[] = [];
    let totalRows = 0;
    let tableIndex = 0;

    $("table").each((_tableElIdx, tableEl) => {
      if (tableIndex >= MAX_TABLES) {
        throw new BadRequestException(
          `Document contains more than ${String(MAX_TABLES)} tables`,
        );
      }

      const rows: NormalizedRow[] = [];
      let rowIndex = 0;

      $(tableEl)
        .find("tr")
        .each((_rowElIdx, rowEl) => {
          if (totalRows >= MAX_ROWS) {
            throw new BadRequestException(
              `Document contains more than ${String(MAX_ROWS)} total rows`,
            );
          }

          const cells: NormalizedCell[] = [];
          let columnIndex = 0;

          $(rowEl)
            .find("td, th")
            .each((_cellElIdx, cellEl) => {
              if (columnIndex >= MAX_CELLS_PER_ROW) {
                throw new BadRequestException(
                  `Row contains more than ${String(MAX_CELLS_PER_ROW)} cells`,
                );
              }

              const rawText = $(cellEl).text();
              const normalized = this.normalizeCellText(rawText);

              if (normalized.length > MAX_CELL_TEXT_LENGTH) {
                throw new BadRequestException(
                  `Cell text exceeds the maximum length of ${String(MAX_CELL_TEXT_LENGTH)} characters`,
                );
              }

              cells.push({ columnIndex, text: normalized });
              columnIndex += 1;
            });

          rows.push({ rowIndex, cells });
          rowIndex += 1;
          totalRows += 1;
        });

      if (rows.length > 0) {
        tables.push({ tableIndex, rows });
      }
      tableIndex += 1;
    });

    const paragraphs: NormalizedParagraph[] = [];
    let paragraphIndex = 0;

    $("body")
      .children()
      .each((_childIdx, childEl) => {
        if ($(childEl).is("table")) return;

        if ($(childEl).is("p")) {
          if (paragraphIndex >= MAX_PARAGRAPHS) {
            throw new BadRequestException(
              `Document contains more than ${String(MAX_PARAGRAPHS)} top-level paragraphs`,
            );
          }

          const text = $(childEl).text();
          const normalized = this.normalizeCellText(text);

          if (normalized.length > MAX_PARAGRAPH_TEXT_LENGTH) {
            throw new BadRequestException(
              `Paragraph text exceeds the maximum length of ${String(MAX_PARAGRAPH_TEXT_LENGTH)} characters`,
            );
          }

          if (normalized.length > 0) {
            paragraphs.push({ paragraphIndex, text: normalized });
            paragraphIndex += 1;
          }
        }
      });

    const metadata: NormalizedDocumentMetadata = {
      totalTables: tables.length,
      totalParagraphs: paragraphs.length,
      totalRows,
    };

    return { tables, paragraphs, metadata };
  }

  private normalizeCellText(text: string): string {
    return text
      .replace(/\r\n/g, " ")
      .replace(/\r/g, " ")
      .replace(/\n/g, " ")
      .replace(/\t/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private isValidZip(buffer: Buffer): boolean {
    if (buffer.length < 4) return false;
    return buffer[0] === ZIP_SIGNATURE[0] &&
      buffer[1] === ZIP_SIGNATURE[1] &&
      buffer[2] === ZIP_SIGNATURE[2] &&
      buffer[3] === ZIP_SIGNATURE[3];
  }
}
