import { randomUUID } from "node:crypto";
import type {
  NormalizedDocument,
  NormalizedRow,
  NormalizedTable,
  ContentEntry,
} from "../types/normalized-document.types";
import type { VocabularyPreviewStatus } from "../types/vocabulary-preview.types";
import type {
  VocabularySectionDraft,
  VocabularyItemDraft,
  VocabularyStructuredDraft,
} from "../types/vocabulary-structured.types";
import { isHeaderRow, isHeaderCell } from "../utils/vocabulary-header";
import { getSectionTitleMetadata, isSectionTitleRow } from "../utils/vocabulary-section-title";
import { classifyVocabularyTable } from "../utils/vocabulary-table-classifier";
import { parseWord } from "../utils/word-normalizer";

const MAX_VOCABULARY_ITEMS = 500;

interface HeadingParts {
  english: string | null;
  arabic: string | null;
}

export class VocabularyTableV2Parser {
  parse(document: NormalizedDocument): VocabularyStructuredDraft {
    const warnings: string[] = [];
    const errors: string[] = [];
    const sections: VocabularySectionDraft[] = [];
    const items: VocabularyItemDraft[] = [];
    let globalDisplayOrder = 0;

    if (document.tables.length === 0) {
      warnings.push("Document contains no tables for vocabulary parsing");
      return {
        parserProfile: "VOCABULARY_STRUCTURED_V2",
        sections: [],
        items: [],
        counts: { total: 0, valid: 0, warning: 0, invalid: 0 },
        warnings,
        errors,
      };
    }

    const headingsByTable = this.extractHeadingsByTable(document);

    for (const table of document.tables) {
      const tableHeading = headingsByTable.get(table.tableIndex) ?? null;
      const classification = classifyVocabularyTable(table);

      if (classification.kind === "SYNONYM_ANTONYM") {
        globalDisplayOrder = this.processSynonymAntonymTable(
          table, sections, items, globalDisplayOrder, warnings, errors, tableHeading,
        );
      } else {
        globalDisplayOrder = this.processStandardTable(
          table, sections, items, globalDisplayOrder, warnings, errors, tableHeading,
        );
      }
    }

    const deduped = this.deduplicateItems(items);
    const cleaned = this.cleanSectionItems(sections, deduped);
    return this.buildResult(cleaned.sections, cleaned.items, warnings, errors);
  }

  /**
   * Collects section headings from top-level paragraphs and maps each heading
   * to the table that immediately follows it in document order.
   *
   * Consecutive English + Arabic heading paragraphs that belong to the same
   * section are combined into a single title, e.g.
   * "المفردات الرئيسية - Key vocabularies".
   */
  private extractHeadingsByTable(document: NormalizedDocument): Map<number, string> {
    const headingsByTable = new Map<number, string>();
    const order = document.contentOrder ?? this.inferOrder(document);
    let pendingTitle: string | null = null;
    let pendingParts: HeadingParts = { english: null, arabic: null };

    for (const entry of order) {
      if (entry.kind === "paragraph") {
        const paragraph = document.paragraphs[entry.index];
        const text = paragraph.text.trim();
        if (!text) continue;

        const pseudoRow: NormalizedRow = {
          rowIndex: paragraph.paragraphIndex,
          cells: [{ columnIndex: 0, text }],
        };
        const isHeading = paragraph.headingLevel === 1;
        const isTitle = isHeading || isSectionTitleRow(pseudoRow);
        if (!isTitle) {
          pendingTitle = this.combineHeadingParts(pendingParts);
          pendingParts = { english: null, arabic: null };
          continue;
        }

        const isArabic = /[\u0600-\u06FF]/.test(text);
        if (isArabic) {
          if (pendingParts.arabic === null) {
            pendingParts.arabic = this.normalizeArabicTitle(text);
          } else {
            pendingTitle = this.combineHeadingParts(pendingParts);
            pendingParts = { english: null, arabic: this.normalizeArabicTitle(text) };
          }
        } else {
          if (pendingParts.english === null) {
            pendingParts.english = text;
          } else {
            pendingTitle = this.combineHeadingParts(pendingParts);
            pendingParts = { english: text, arabic: null };
          }
        }
      } else {
        if (pendingTitle === null) {
          pendingTitle = this.combineHeadingParts(pendingParts);
          pendingParts = { english: null, arabic: null };
        }
        if (pendingTitle !== null) {
          headingsByTable.set(entry.index, pendingTitle);
          pendingTitle = null;
        }
      }
    }

    return headingsByTable;
  }

  private inferOrder(document: NormalizedDocument): readonly ContentEntry[] {
    const order: ContentEntry[] = [];
    for (let i = 0; i < document.paragraphs.length; i++) {
      order.push({ kind: "paragraph", index: i });
    }
    for (let i = 0; i < document.tables.length; i++) {
      order.push({ kind: "table", index: i });
    }
    return order;
  }

  private combineHeadingParts(parts: HeadingParts): string | null {
    const arabic = parts.arabic?.trim();
    const english = parts.english?.trim();
    if (arabic && english) return `${arabic} - ${english}`;
    if (arabic) return arabic;
    if (english) return english;
    return null;
  }

  private normalizeArabicTitle(text: string): string {
    return text
      .replace(/\s+/g, " ")
      .replace(/المفردات\s+الرئيسيه/g, "المفردات الرئيسية")
      .replace(/المفردات\s+الاضافيه/g, "المفردات الإضافية")
      .replace(/المفردات\s+الاضافية/g, "المفردات الإضافية")
      .trim();
  }

  private processStandardTable(
    table: NormalizedTable,
    sections: VocabularySectionDraft[],
    items: VocabularyItemDraft[],
    displayOrder: number,
    warnings: string[],
    errors: string[],
    headingFromParagraph: string | null = null,
  ): number {
    let currentSection: VocabularySectionDraft | null = null;
    let headerSeen = false;

    for (const row of table.rows) {
      const sectionMeta = getSectionTitleMetadata(row);

      if (sectionMeta !== null) {
        currentSection = this.createSection(
          "STANDARD_VOCABULARY",
          sectionMeta.normalizedTitle,
          table.tableIndex,
          sectionMeta.rowIndex,
          sections.length,
        );
        sections.push(currentSection);
        continue;
      }

      const hasAnyContent = row.cells.some((c) => c.text.trim().length > 0);
      if (!hasAnyContent) {
        continue;
      }

      if (!headerSeen && isHeaderRow(row)) {
        headerSeen = true;
        continue;
      }

      if (currentSection === null) {
        currentSection = this.createSection(
          "STANDARD_VOCABULARY",
          headingFromParagraph,
          table.tableIndex,
          null,
          sections.length,
        );
        sections.push(currentSection);
      }

      const cellCount = row.cells.length;

      if (cellCount === 2) {
        displayOrder = this.processStandardPair(
          row, table.tableIndex, 0, 1, 0,
          currentSection.clientDraftId, items, displayOrder, warnings, errors,
        );
      } else if (cellCount === 4) {
        displayOrder = this.processStandardPair(
          row, table.tableIndex, 0, 1, 0,
          currentSection.clientDraftId, items, displayOrder, warnings, errors,
        );
        displayOrder = this.processStandardPair(
          row, table.tableIndex, 2, 3, 1,
          currentSection.clientDraftId, items, displayOrder, warnings, errors,
        );
      } else {
        warnings.push(
          `Table ${String(table.tableIndex)} row ${String(row.rowIndex)}: unsupported layout (${String(cellCount)} cells)`,
        );
      }
    }

    return displayOrder;
  }

  private processSynonymAntonymTable(
    table: NormalizedTable,
    sections: VocabularySectionDraft[],
    items: VocabularyItemDraft[],
    displayOrder: number,
    warnings: string[],
    errors: string[],
    headingFromParagraph: string | null = null,
  ): number {
    let sectionTitle: string | null = null;
    let sectionTitleRowIndex: number | null = null;

    for (const row of table.rows) {
      const sectionMeta = getSectionTitleMetadata(row);
      if (sectionMeta !== null) {
        sectionTitle = sectionMeta.normalizedTitle;
        sectionTitleRowIndex = sectionMeta.rowIndex;
        break;
      }
    }

    const section = this.createSection(
      "SYNONYM_ANTONYM",
      sectionTitle ?? headingFromParagraph,
      table.tableIndex,
      sectionTitleRowIndex,
      sections.length,
    );

    let firstRelationPushed = false;

    for (const row of table.rows) {
      const sectionMeta = getSectionTitleMetadata(row);

      if (sectionMeta !== null) {
        continue;
      }

      const hasAnyContent = row.cells.some((c) => c.text.trim().length > 0);
      if (!hasAnyContent) {
        continue;
      }

      if (row.cells.length >= 3 && row.cells.every((c) => isHeaderCell(c.text))) {
        continue;
      }

      const primaryWord = (row.cells[0]?.text ?? "").trim();
      const primaryTranslation = (row.cells[1]?.text ?? "").trim();
      const rawSynonym = (row.cells[2]?.text ?? "").trim();
      const rawSynonymTranslation = (row.cells[3]?.text ?? "").trim();
      const rawAntonym = (row.cells[4]?.text ?? "").trim();
      const rawAntonymTranslation = (row.cells[5]?.text ?? "").trim();

      const synonym = rawSynonym.length > 0 ? rawSynonym : null;
      const synonymTranslation = rawSynonymTranslation.length > 0 ? rawSynonymTranslation : null;
      const antonym = rawAntonym.length > 0 ? rawAntonym : null;
      const antonymTranslation = rawAntonymTranslation.length > 0 ? rawAntonymTranslation : null;

      const hasPrimaryWord = primaryWord.length > 0;
      const hasPrimaryTranslation = primaryTranslation.length > 0;

      if (!hasPrimaryWord && !hasPrimaryTranslation) {
        continue;
      }

      if (items.length >= MAX_VOCABULARY_ITEMS) {
        errors.push(`Maximum vocabulary item count exceeded (${String(MAX_VOCABULARY_ITEMS)})`);
        return displayOrder;
      }

      const itemWarnings: string[] = [];
      const itemErrors: string[] = [];

      if (!hasPrimaryWord) {
        itemErrors.push("MISSING_WORD");
      }
      if (!hasPrimaryTranslation) {
        itemErrors.push("MISSING_TRANSLATION");
      }

      if (synonym !== null && synonymTranslation !== null) {
        itemWarnings.push("SYNONYM_ANTONYM_RAW_TEXT");
      }

      if (antonym !== null && antonymTranslation !== null) {
        if (!itemWarnings.includes("SYNONYM_ANTONYM_RAW_TEXT")) {
          itemWarnings.push("SYNONYM_ANTONYM_RAW_TEXT");
        }
      }

      if (!firstRelationPushed) {
        sections.push(section);
        firstRelationPushed = true;
      }

      const status = this.resolveStatus(itemWarnings, itemErrors);

      items.push({
        kind: "SYNONYM_ANTONYM_RELATION",
        clientDraftId: randomUUID(),
        sectionClientDraftId: section.clientDraftId,
        primaryWord,
        primaryTranslation,
        synonym,
        synonymTranslation,
        antonym,
        antonymTranslation,
        displayOrder,
        sourceTableIndex: table.tableIndex,
        sourceRowIndex: row.rowIndex,
        status,
        warnings: itemWarnings,
        errors: itemErrors,
      });

      displayOrder += 1;
    }

    return displayOrder;
  }

  private processStandardPair(
    row: NormalizedRow,
    tableIndex: number,
    wordCol: number,
    transCol: number,
    pairIndex: 0 | 1,
    sectionClientDraftId: string,
    items: VocabularyItemDraft[],
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
      errors.push(`Maximum vocabulary item count exceeded (${String(MAX_VOCABULARY_ITEMS)})`);
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
      kind: "STANDARD_ITEM",
      clientDraftId: randomUUID(),
      sectionClientDraftId,
      word: parsed.word,
      translation: hasTranslation ? translationText : "",
      definition: null,
      example: null,
      partOfSpeech: parsed.partOfSpeech,
      displayOrder,
      sourceTableIndex: tableIndex,
      sourceRowIndex: row.rowIndex,
      sourcePairIndex: pairIndex,
      status,
      warnings: itemWarnings,
      errors: itemErrors,
    });

    return displayOrder + 1;
  }

  private createSection(
    kind: "STANDARD_VOCABULARY" | "SYNONYM_ANTONYM",
    title: string | null,
    sourceTableIndex: number,
    sourceTitleRowIndex: number | null,
    displayOrder: number,
  ): VocabularySectionDraft {
    return {
      clientDraftId: randomUUID(),
      kind,
      title,
      displayOrder,
      sourceTableIndex,
      sourceTitleRowIndex,
    };
  }

  private deduplicateItems(items: readonly VocabularyItemDraft[]): readonly VocabularyItemDraft[] {
    const seen = new Map<string, number>();

    return items.map((item) => {
      if (item.kind !== "STANDARD_ITEM") {
        return item;
      }

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

  private cleanSectionItems(
    sections: readonly VocabularySectionDraft[],
    items: readonly VocabularyItemDraft[],
  ): { sections: readonly VocabularySectionDraft[]; items: readonly VocabularyItemDraft[] } {
    const sectionIds = new Set<string>();
    for (const section of sections) {
      sectionIds.add(section.clientDraftId);
    }

    const orphanSectionIds = new Set<string>();

    for (const section of sections) {
      const hasItems = items.some((item) => item.sectionClientDraftId === section.clientDraftId);
      if (!hasItems) {
        orphanSectionIds.add(section.clientDraftId);
      }
    }

    const cleanedSections = sections.filter((s) => !orphanSectionIds.has(s.clientDraftId));

    return { sections: cleanedSections, items };
  }

  private resolveStatus(warnings: readonly string[], errors: readonly string[]): VocabularyPreviewStatus {
    if (errors.length > 0) return "INVALID";
    if (warnings.length > 0) return "WARNING";
    return "VALID";
  }

  private buildResult(
    sections: readonly VocabularySectionDraft[],
    items: readonly VocabularyItemDraft[],
    warnings: readonly string[],
    errors: readonly string[],
  ): VocabularyStructuredDraft {
    const counts = { total: 0, valid: 0, warning: 0, invalid: 0 };

    for (const item of items) {
      counts.total += 1;
      if (item.status === "VALID") counts.valid += 1;
      else if (item.status === "WARNING") counts.warning += 1;
      else counts.invalid += 1;
    }

    return {
      parserProfile: "VOCABULARY_STRUCTURED_V2",
      sections,
      items,
      counts,
      warnings,
      errors,
    };
  }
}
