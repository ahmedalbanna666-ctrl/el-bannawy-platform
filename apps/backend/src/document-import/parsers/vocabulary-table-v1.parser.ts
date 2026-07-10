import { randomUUID } from "node:crypto";
import type { NormalizedDocument } from "../types/normalized-document.types";
import type {
  VocabularyImportPreview,
  VocabularyPreviewItem,
  VocabularyPreviewStatus,
} from "../types/vocabulary-preview.types";
import { parseWord } from "../utils/word-normalizer";
import { detectAndSkipHeaders } from "../utils/vocabulary-header";

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
      const dataRows = detectAndSkipHeaders(table.rows);

      if (dataRows.length === 0) {
        warnings.push(`Table ${String(table.tableIndex)}: no data rows after header detection`);
        continue;
      }

      const cellCounts = new Set(dataRows.map((r) => r.cells.length));
      const uniqueCounts = [...cellCounts];

      if (uniqueCounts.length !== 1 || (uniqueCounts[0] !== 2 && uniqueCounts[0] !== 4)) {
        warnings.push(
          `Table ${String(table.tableIndex)}: unsupported layout — every data row must have exactly 2 or 4 cells (found: ${uniqueCounts.join(", ")})`,
        );
        continue;
      }

      const cellCount = uniqueCounts[0];

      for (const row of dataRows) {
        const pairs = cellCount === 2
          ? [{ cells: [row.cells[0], row.cells[1]], pairIndex: 0 as const }]
          : [
              { cells: [row.cells[0], row.cells[1]], pairIndex: 0 as const },
              { cells: [row.cells[2], row.cells[3]], pairIndex: 1 as const },
            ];

        for (const pair of pairs) {
          const wordText = pair.cells[0]?.text ?? "";
          const translationText = pair.cells[1]?.text ?? "";

          const hasWord = wordText.length > 0;
          const hasTranslation = translationText.length > 0;

          if (!hasWord && !hasTranslation) {
            continue;
          }

          if (items.length >= MAX_VOCABULARY_ITEMS) {
            errors.push(
              `Maximum vocabulary item count exceeded (${String(MAX_VOCABULARY_ITEMS)})`,
            );
            return this.buildResult(items, warnings, errors);
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
            sourceTableIndex: table.tableIndex,
            sourceRowIndex: row.rowIndex,
            sourcePairIndex: pair.pairIndex,
            displayOrder,
            word: parsed.word,
            translation: hasTranslation ? translationText : "",
            partOfSpeech: parsed.partOfSpeech,
            status,
            warnings: itemWarnings,
            errors: itemErrors,
          });

          displayOrder += 1;
        }
      }
    }

    const deduped = this.detectDuplicates(items);
    return this.buildResult(deduped, warnings, errors);
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
