import type { NormalizedRow } from "../types/normalized-document.types";

const SECTION_ALIASES_LOWER: readonly string[] = [
  "key vocabularies",
  "extra vocabularies",
  "collocations, prepositions & expressions",
  "collocations, prepositions and expressions",
  "collocations",
  "prepositions & expressions",
  "prepositions and expressions",
];

const SECTION_ALIASES_AR: readonly string[] = [
  "المفردات الرئيسية",
  "المفردات الرئيسيه",
  "المفردات الاضافية",
  "المفردات الاضافيه",
  "المفردات الإضافية",
  "المفردات الإضافيه",
  "حروف الجر",
  "المصطلحات",
  "حروف الجر والمصطلحات",
];

export function isSectionTitleRow(row: NormalizedRow): boolean {
  const nonEmpty = row.cells.filter((c) => c.text.trim().length > 0);

  if (nonEmpty.length !== 1) {
    return false;
  }

  const text = nonEmpty[0].text.trim().replace(/\s+/g, " ");
  const lower = text.toLowerCase();

  for (const alias of SECTION_ALIASES_LOWER) {
    if (lower.includes(alias)) {
      return true;
    }
  }

  for (const alias of SECTION_ALIASES_AR) {
    if (text.includes(alias)) {
      return true;
    }
  }

  return false;
}

export interface SectionTitleMetadata {
  readonly rawTitle: string;
  readonly normalizedTitle: string;
  readonly rowIndex: number;
}

export function getSectionTitleMetadata(row: NormalizedRow): SectionTitleMetadata | null {
  const nonEmpty = row.cells.filter((c) => c.text.trim().length > 0);

  if (nonEmpty.length !== 1) {
    return null;
  }

  const text = nonEmpty[0].text.trim().replace(/\s+/g, " ");
  const lower = text.toLowerCase();

  let isTitle = false;

  for (const alias of SECTION_ALIASES_LOWER) {
    if (lower.includes(alias)) {
      isTitle = true;
      break;
    }
  }

  if (!isTitle) {
    for (const alias of SECTION_ALIASES_AR) {
      if (text.includes(alias)) {
        isTitle = true;
        break;
      }
    }
  }

  if (!isTitle) {
    return null;
  }

  return {
    rawTitle: text,
    normalizedTitle: text.replace(/\s+/g, " ").trim(),
    rowIndex: row.rowIndex,
  };
}
