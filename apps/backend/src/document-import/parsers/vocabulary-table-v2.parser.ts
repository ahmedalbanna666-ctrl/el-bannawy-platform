import { randomUUID } from "node:crypto";
import type { NormalizedDocument, NormalizedRow, NormalizedTable } from "../types/normalized-document.types";
import type { VocabularyPreviewStatus } from "../types/vocabulary-preview.types";
import type {
  VocabularySectionDraft,
  VocabularyItemDraft,
  VocabularyStructuredDraft,
} from "../types/vocabulary-structured.types";
import { isHeaderRow, isHeaderCell } from "../utils/vocabulary-header";
import { getSectionTitleMetadata } from "../utils/vocabulary-section-title";
import { classifyVocabularyTable } from "../utils/vocabulary-table-classifier";
import { parseWord } from "../utils/word-normalizer";

const MAX_VOCABULARY_ITEMS = 500;

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

    for (const table of document.tables) {
      const classification = classifyVocabularyTable(table);

      if (classification.kind === "SYNONYM_ANTONYM") {
        globalDisplayOrder = this.processSynonymAntonymTable(
          table, sections, items, globalDisplayOrder, warnings, errors,
        );
      } else {
        globalDisplayOrder = this.processStandardTable(
          table, sections, items, globalDisplayOrder, warnings, errors,
        );
      }
    }

    const deduped = this.deduplicateItems(items);
    const cleaned = this.cleanSectionItems(sections, deduped);
    return this.buildResult(cleaned.sections, cleaned.items, warnings, errors);
  }

  private processStandardTable(
    table: NormalizedTable,
    sections: VocabularySectionDraft[],
    items: VocabularyItemDraft[],
    displayOrder: number,
    warnings: string[],
    errors: string[],
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
          null,
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
      sectionTitle,
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
