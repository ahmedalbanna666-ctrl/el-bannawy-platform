import { randomUUID } from "node:crypto";
import type { NormalizedDocument, NormalizedRow, NormalizedTable } from "../types/normalized-document.types";
import type {
  VocabularyImportPreview,
  VocabularyPreviewItem,
  VocabularyPreviewStatus,
} from "../types/vocabulary-preview.types";
import { parseWord } from "../utils/word-normalizer";
import { detectAndSkipHeaders, isHeaderCell } from "../utils/vocabulary-header";
import { isSectionTitleRow } from "../utils/vocabulary-section-title";

const MAX_VOCABULARY_ITEMS = 500;

export class VocabularyTableV1Parser {
  parse(document: NormalizedDocument): VocabularyImportPreview {
    const warnings: string[] = [];
    const errors: string[] = [];
    const items: VocabularyPreviewItem[] = [];
    let displayOrder = 0;

    if (document.tables.length === 0) {
      warnings.push("Document contains no tables for vocabulary parsing");
      return {
        parserProfile: "VOCABULARY_TABLE_V1",
        counts: { total: 0, valid: 0, warning: 0, invalid: 0 },
        items: [],
        warnings,
        errors,
      };
    }

    for (const table of document.tables) {
      const isSynAntTable = VocabularyTableV1Parser.isSynonymAntonymTable(table);
      const dataRows = detectAndSkipHeaders(table.rows);

      if (dataRows.length === 0) {
        warnings.push(`Table ${String(table.tableIndex)}: no data rows after header detection`);
        continue;
      }

      let synAntWarningEmitted = false;

      for (const row of dataRows) {
        if (isSectionTitleRow(row)) {
          continue;
        }

        const hasAnyContent = row.cells.some((c) => c.text.trim().length > 0);
        if (!hasAnyContent) {
          continue;
        }

        const cellCount = row.cells.length;

        if (cellCount === 2) {
          displayOrder = this.processPair(row, table.tableIndex, 0, 1, 0, items, displayOrder, warnings, errors);
        } else if (cellCount === 4) {
          displayOrder = this.processPair(row, table.tableIndex, 0, 1, 0, items, displayOrder, warnings, errors);
          displayOrder = this.processPair(row, table.tableIndex, 2, 3, 1, items, displayOrder, warnings, errors);
        } else if (cellCount === 6 && isSynAntTable) {
          if (!synAntWarningEmitted) {
            warnings.push(
              `Synonym and antonym columns detected (table ${String(table.tableIndex)}): ` +
              "these were not imported because the current vocabulary model does not store vocabulary relationships.",
            );
            synAntWarningEmitted = true;
          }
          displayOrder = this.processPair(row, table.tableIndex, 0, 1, 0, items, displayOrder, warnings, errors);
        } else {
          warnings.push(
            `Table ${String(table.tableIndex)} row ${String(row.rowIndex)}: unsupported layout (${String(cellCount)} cells)`,
          );
        }
      }
    }

    const deduped = this.detectDuplicates(items);
    return this.buildResult(deduped, warnings, errors);
  }

  private processPair(
    row: NormalizedRow,
    tableIndex: number,
    wordCol: number,
    transCol: number,
    pairIndex: 0 | 1,
    items: VocabularyPreviewItem[],
    displayOrder: number,
    warnings: string[],
    errors: string[],
  ): number {
    const wordText = wordCol < row.cells.length ? row.cells[wordCol].text : "";
    const translationText = transCol < row.cells.length ? row.cells[transCol].text : "";

    const hasWord = wordText.length > 0;
    const hasTranslation = translationText.length > 0;

    if (!hasWord && !hasTranslation) {
      return displayOrder;
    }

    if (items.length >= MAX_VOCABULARY_ITEMS) {
      errors.push(
        `Maximum vocabulary item count exceeded (${String(MAX_VOCABULARY_ITEMS)})`,
      );
      return displayOrder;
    }

    const parsed = parseWord(wordText);
    const itemWarnings: string[] = [];
    const itemErrors: string[] = [];

    if (!hasWord) {
      itemErrors.push("MISSING_WORD");
    }
    if (!hasTranslation) {
      itemErrors.push("MISSING_TRANSLATION");
    }

    const status = this.resolveStatus(itemWarnings, itemErrors);

    items.push({
      clientDraftId: randomUUID(),
      sourceTableIndex: tableIndex,
      sourceRowIndex: row.rowIndex,
      sourcePairIndex: pairIndex,
      displayOrder,
      word: parsed.word,
      translation: hasTranslation ? translationText : "",
      partOfSpeech: parsed.partOfSpeech,
      status,
      warnings: itemWarnings,
      errors: itemErrors,
    });

    return displayOrder + 1;
  }

  private static isSynonymAntonymTable(table: NormalizedTable): boolean {
    if (table.rows.length === 0) return false;
    const firstRow = table.rows[0];
    if (firstRow.cells.length !== 6) return false;
    return firstRow.cells.every((c) => isHeaderCell(c.text));
  }

  private resolveStatus(warnings: readonly string[], errors: readonly string[]): VocabularyPreviewStatus {
    if (errors.length > 0) return "INVALID";
    if (warnings.length > 0) return "WARNING";
    return "VALID";
  }

  private detectDuplicates(items: readonly VocabularyPreviewItem[]): readonly VocabularyPreviewItem[] {
    const seen = new Map<string, number>();

    return items.map((item) => {
      const key = item.word.trim().normalize("NFC").toLowerCase().replace(/\s+/g, " ");
      const existing = seen.get(key);

      if (existing === undefined) {
        seen.set(key, item.displayOrder);
        return item;
      }

      const newWarnings = [...item.warnings, "DUPLICATE_IN_DOCUMENT"];
      const newErrors = [...item.errors];
      const status = this.resolveStatus(newWarnings, newErrors);

      return { ...item, warnings: newWarnings, errors: newErrors, status };
    });
  }

  private buildResult(
    items: readonly VocabularyPreviewItem[],
    warnings: readonly string[],
    errors: readonly string[],
  ): VocabularyImportPreview {
    const counts: { total: number; valid: number; warning: number; invalid: number } = {
      total: 0,
      valid: 0,
      warning: 0,
      invalid: 0,
    };

    for (const item of items) {
      counts.total += 1;
      if (item.status === "VALID") counts.valid += 1;
      else if (item.status === "WARNING") counts.warning += 1;
      else counts.invalid += 1;
    }

    return {
      parserProfile: "VOCABULARY_TABLE_V1",
      counts,
      items,
      warnings,
      errors,
    };
  }
}
