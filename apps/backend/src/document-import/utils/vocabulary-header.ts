import type { NormalizedRow } from "../types/normalized-document.types";

const ENGLISH_HEADERS = new Set(["word", "meaning", "vocabulary", "translation", "synonym", "antonym"]);
const ARABIC_HEADERS = new Set(["الكلمة", "المعنى", "الترجمة", "كلمة", "معنى", "المرادف", "المضاد"]);

const HEADERS_WORD = new Set(["word", "vocabulary", "الكلمة", "كلمة"]);
const HEADERS_MEANING = new Set(["meaning", "translation", "المعنى", "الترجمة", "معنى"]);

export function isHeaderRow(row: NormalizedRow): boolean {
  const texts = row.cells.map((c) => c.text.trim().toLowerCase());
  return texts.every((t) => isHeaderCell(t));
}

export function isHeaderCell(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return ENGLISH_HEADERS.has(lower) || ARABIC_HEADERS.has(text.trim());
}

export function isWordHeaderCell(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return HEADERS_WORD.has(lower) || HEADERS_WORD.has(text.trim());
}

export function isMeaningHeaderCell(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return HEADERS_MEANING.has(lower) || HEADERS_MEANING.has(text.trim());
}

export function detectAndSkipHeaders(rows: readonly NormalizedRow[]): readonly NormalizedRow[] {
  const dataRows: NormalizedRow[] = [];
  let headerSeen = false;

  for (const row of rows) {
    if (!headerSeen && isHeaderRow(row)) {
      headerSeen = true;
      continue;
    }
    dataRows.push(row);
  }

  return dataRows;
}
