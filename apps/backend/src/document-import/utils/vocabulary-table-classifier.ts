import type { NormalizedTable } from "../types/normalized-document.types";

export type VocabularyTableKind = "STANDARD_VOCABULARY" | "SYNONYM_ANTONYM";

export interface VocabularyTableClassification {
  readonly kind: VocabularyTableKind;
  readonly headerRowIndex: number | null;
}

const MAX_HEADER_SCAN_ROWS = 5;

const WORD_CONCEPTS = new Set(["word", "الكلمة"]);

const SYNONYM_CONCEPTS = new Set(["synonym", "المرادف", "مرادف"]);

const ANTONYM_CONCEPTS = new Set(["antonym", "المضاد", "مضاد"]);

function normalizeCellText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

export function classifyVocabularyTable(table: NormalizedTable): VocabularyTableClassification {
  let nonBlankSeen = 0;

  for (const row of table.rows) {
    const nonEmpty = row.cells.filter((c) => c.text.trim().length > 0);
    if (nonEmpty.length === 0) continue;

    nonBlankSeen++;
    if (nonBlankSeen > MAX_HEADER_SCAN_ROWS) break;

    const normalized = nonEmpty.map((c) => normalizeCellText(c.text));
    const hasWord = normalized.some((t) => WORD_CONCEPTS.has(t));
    const hasSynonym = normalized.some((t) => SYNONYM_CONCEPTS.has(t));
    const hasAntonym = normalized.some((t) => ANTONYM_CONCEPTS.has(t));

    if (hasWord && hasSynonym && hasAntonym) {
      return { kind: "SYNONYM_ANTONYM", headerRowIndex: row.rowIndex };
    }
  }

  return { kind: "STANDARD_VOCABULARY", headerRowIndex: null };
}
