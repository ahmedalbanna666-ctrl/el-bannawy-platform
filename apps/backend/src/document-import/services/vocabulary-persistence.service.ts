import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { VocabularySectionKind as PrismaVocabularySectionKind } from "@prisma/client";
import type {
  VocabularyStructuredDraft,
  VocabularySectionDraft,
  VocabularyStandardItemDraft,
  VocabularyRelationDraft,
} from "../types/vocabulary-structured.types";
import type {
  StructuredVocabularyPersistenceOptions,
  StructuredVocabularyPersistenceResult,
  PersistedSectionResult,
  PersistenceValidationError,
} from "../types/vocabulary-persistence.types";
import { PersistenceValidationException } from "../types/vocabulary-persistence.types";

const MAX_SECTIONS = 50;
const MAX_ITEMS = 500;
const MAX_RELATIONS = 500;
const EXPECTED_PARSER_PROFILE = "VOCABULARY_STRUCTURED_V2" as const;

@Injectable()
export class VocabularyPersistenceService {
  constructor(private readonly prisma: PrismaService) {}

  async persistStructuredVocabulary(
    lessonId: string,
    draft: VocabularyStructuredDraft,
    options?: StructuredVocabularyPersistenceOptions,
  ): Promise<StructuredVocabularyPersistenceResult> {
    const mode = options?.mode ?? "REPLACE_STRUCTURED";

    this.validateLessonId(lessonId);
    this.validateDraft(draft);

    const errors: PersistenceValidationError[] = [];
    this.validateParserProfile(draft, errors);
    this.validateSections(draft, errors);
    this.validateItems(draft, errors);
    this.validateLimits(draft, errors);

    if (errors.length > 0) {
      throw new PersistenceValidationException(errors);
    }

    return this.executeAtomicPersistence(lessonId, draft, mode);
  }

  private validateLessonId(lessonId: string): void {
    if (!lessonId || lessonId.trim().length === 0) {
      throw new PersistenceValidationException([
        { code: "EMPTY_LESSON_ID", message: "lessonId must be non-empty" },
      ]);
    }
  }

  private validateParserProfile(
    draft: VocabularyStructuredDraft,
    errors: PersistenceValidationError[],
  ): void {
    if (draft.parserProfile !== EXPECTED_PARSER_PROFILE) {
      errors.push({
        code: "INVALID_PARSER_PROFILE",
        message: `Expected parserProfile "${EXPECTED_PARSER_PROFILE}", got "${draft.parserProfile}"`,
      });
    }
  }

  private validateDraft(draft: VocabularyStructuredDraft): void {
    if (!draft) {
      throw new PersistenceValidationException([
        { code: "NULL_DRAFT", message: "draft must not be null" },
      ]);
    }
  }

  private validateSections(
    draft: VocabularyStructuredDraft,
    errors: PersistenceValidationError[],
  ): void {
    const seenIds = new Set<string>();
    const duplicateIds = new Set<string>();

    for (const section of draft.sections) {
      if (seenIds.has(section.clientDraftId)) {
        duplicateIds.add(section.clientDraftId);
      }
      seenIds.add(section.clientDraftId);

      if (section.displayOrder < 0) {
        errors.push({
          code: "NEGATIVE_SECTION_DISPLAY_ORDER",
          message: `Section "${section.clientDraftId}" has negative displayOrder: ${section.displayOrder}`,
          sectionClientDraftId: section.clientDraftId,
        });
      }
    }

    for (const id of duplicateIds) {
      errors.push({
        code: "DUPLICATE_SECTION_CLIENT_DRAFT_ID",
        message: `Duplicate section clientDraftId: "${id}"`,
        sectionClientDraftId: id,
      });
    }
  }

  private validateItems(
    draft: VocabularyStructuredDraft,
    errors: PersistenceValidationError[],
  ): void {
    const sectionMap = new Map<string, VocabularySectionDraft>();
    for (const section of draft.sections) {
      sectionMap.set(section.clientDraftId, section);
    }

    for (let i = 0; i < draft.items.length; i++) {
      const item = draft.items[i];
      this.validateItem(item, i, sectionMap, errors);
    }
  }

  private validateItem(
    item: VocabularyStandardItemDraft | VocabularyRelationDraft,
    index: number,
    sectionMap: Map<string, VocabularySectionDraft>,
    errors: PersistenceValidationError[],
  ): void {
    const section = sectionMap.get(item.sectionClientDraftId);
    if (!section) {
      errors.push({
        code: "MISSING_SECTION_REFERENCE",
        message: `Item at index ${index} references unknown section "${item.sectionClientDraftId}"`,
        itemIndex: index,
        itemClientDraftId: item.clientDraftId,
        sectionClientDraftId: item.sectionClientDraftId,
      });
      return;
    }

    if (item.displayOrder < 0) {
      errors.push({
        code: "NEGATIVE_ITEM_DISPLAY_ORDER",
        message: `Item "${item.clientDraftId}" has negative displayOrder: ${item.displayOrder}`,
        itemIndex: index,
        itemClientDraftId: item.clientDraftId,
      });
    }

    if (item.kind === "STANDARD_ITEM") {
      this.validateStandardItem(item, index, section, errors);
    } else {
      this.validateRelationItem(item, index, section, errors);
    }
  }

  private validateStandardItem(
    item: VocabularyStandardItemDraft,
    index: number,
    section: VocabularySectionDraft,
    errors: PersistenceValidationError[],
  ): void {
    if (section.kind !== "STANDARD_VOCABULARY") {
      errors.push({
        code: "STANDARD_ITEM_IN_WRONG_SECTION_KIND",
        message: `STANDARD_ITEM "${item.clientDraftId}" references SYNONYM_ANTONYM section "${section.clientDraftId}"`,
        itemIndex: index,
        itemClientDraftId: item.clientDraftId,
        sectionClientDraftId: item.sectionClientDraftId,
      });
    }

    if (!item.word || item.word.trim().length === 0) {
      errors.push({
        code: "EMPTY_STANDARD_WORD",
        message: `STANDARD_ITEM "${item.clientDraftId}" has empty word`,
        itemIndex: index,
        itemClientDraftId: item.clientDraftId,
      });
    }

    if (!item.translation || item.translation.trim().length === 0) {
      errors.push({
        code: "EMPTY_STANDARD_TRANSLATION",
        message: `STANDARD_ITEM "${item.clientDraftId}" has empty translation`,
        itemIndex: index,
        itemClientDraftId: item.clientDraftId,
      });
    }

    if (item.status === "INVALID") {
      errors.push({
        code: "INVALID_ITEM_REJECTED",
        message: `STANDARD_ITEM "${item.clientDraftId}" is INVALID`,
        itemIndex: index,
        itemClientDraftId: item.clientDraftId,
      });
    }
  }

  private validateRelationItem(
    item: VocabularyRelationDraft,
    index: number,
    section: VocabularySectionDraft,
    errors: PersistenceValidationError[],
  ): void {
    if (section.kind !== "SYNONYM_ANTONYM") {
      errors.push({
        code: "RELATION_IN_WRONG_SECTION_KIND",
        message: `SYNONYM_ANTONYM_RELATION "${item.clientDraftId}" references STANDARD_VOCABULARY section "${section.clientDraftId}"`,
        itemIndex: index,
        itemClientDraftId: item.clientDraftId,
        sectionClientDraftId: item.sectionClientDraftId,
      });
    }

    if (!item.primaryWord || item.primaryWord.trim().length === 0) {
      errors.push({
        code: "EMPTY_RELATION_PRIMARY_WORD",
        message: `SYNONYM_ANTONYM_RELATION "${item.clientDraftId}" has empty primaryWord`,
        itemIndex: index,
        itemClientDraftId: item.clientDraftId,
      });
    }

    if (!item.primaryTranslation || item.primaryTranslation.trim().length === 0) {
      errors.push({
        code: "EMPTY_RELATION_PRIMARY_TRANSLATION",
        message: `SYNONYM_ANTONYM_RELATION "${item.clientDraftId}" has empty primaryTranslation`,
        itemIndex: index,
        itemClientDraftId: item.clientDraftId,
      });
    }

    if (item.status === "INVALID") {
      errors.push({
        code: "INVALID_ITEM_REJECTED",
        message: `SYNONYM_ANTONYM_RELATION "${item.clientDraftId}" is INVALID`,
        itemIndex: index,
        itemClientDraftId: item.clientDraftId,
      });
    }
  }

  private validateLimits(
    draft: VocabularyStructuredDraft,
    errors: PersistenceValidationError[],
  ): void {
    if (draft.sections.length > MAX_SECTIONS) {
      errors.push({
        code: "TOO_MANY_SECTIONS",
        message: `Maximum ${MAX_SECTIONS} sections allowed, got ${draft.sections.length}`,
      });
    }

    const standardCount = draft.items.filter((i) => i.kind === "STANDARD_ITEM").length;
    if (standardCount > MAX_ITEMS) {
      errors.push({
        code: "TOO_MANY_STANDARD_ITEMS",
        message: `Maximum ${MAX_ITEMS} standard items allowed, got ${standardCount}`,
      });
    }

    const relationCount = draft.items.filter((i) => i.kind === "SYNONYM_ANTONYM_RELATION").length;
    if (relationCount > MAX_RELATIONS) {
      errors.push({
        code: "TOO_MANY_RELATIONS",
        message: `Maximum ${MAX_RELATIONS} relations allowed, got ${relationCount}`,
      });
    }
  }

  private async executeAtomicPersistence(
    lessonId: string,
    draft: VocabularyStructuredDraft,
    mode: string,
  ): Promise<StructuredVocabularyPersistenceResult> {
    return this.prisma.$transaction(async (tx) => {
      await tx.lessonVocabulary.deleteMany({
        where: { lessonId, sectionId: { not: null } },
      });

      await tx.vocabularyRelation.deleteMany({
        where: { lessonId },
      });

      await tx.vocabularySection.deleteMany({
        where: { lessonId },
      });

      const sections = draft.sections.map((s) => ({
        lessonId,
        kind: s.kind as PrismaVocabularySectionKind,
        title: s.title,
        displayOrder: s.displayOrder,
        sourceTableIndex: s.sourceTableIndex,
        sourceTitleRowIndex: s.sourceTitleRowIndex,
      }));

      const createdSections: {
        id: string;
        kind: string;
        title: string | null;
        displayOrder: number;
        sourceTableIndex: number | null;
        sourceTitleRowIndex: number | null;
      }[] = [];
      for (const section of sections) {
        const created = await tx.vocabularySection.create({ data: section });
        createdSections.push(created);
      }

      const clientIdToDbId = new Map<string, string>();
      for (let i = 0; i < draft.sections.length; i++) {
        const dbId = createdSections[i].id;
        const draftId = draft.sections[i].clientDraftId;
        clientIdToDbId.set(draftId, dbId);
      }

      const standardItems = draft.items
        .filter((i) => i.kind === "STANDARD_ITEM")
        .map((i) => {
          const item = i as VocabularyStandardItemDraft;
          const sectionId = clientIdToDbId.get(item.sectionClientDraftId);
          if (!sectionId) {
            throw new Error(
              `Unresolved section reference for STANDARD_ITEM "${item.clientDraftId}": "${item.sectionClientDraftId}"`,
            );
          }
          return {
            lessonId,
            sectionId,
            word: item.word,
            translation: item.translation,
            definition: item.definition,
            example: item.example,
            partOfSpeech: item.partOfSpeech,
            displayOrder: item.displayOrder,
            sourceTableIndex: item.sourceTableIndex,
            sourceRowIndex: item.sourceRowIndex,
            sourcePairIndex: item.sourcePairIndex,
          };
        });

      if (standardItems.length > 0) {
        await tx.lessonVocabulary.createMany({ data: standardItems });
      }

      const relations = draft.items
        .filter((i) => i.kind === "SYNONYM_ANTONYM_RELATION")
        .map((i) => {
          const item = i as VocabularyRelationDraft;
          const sectionId = clientIdToDbId.get(item.sectionClientDraftId);
          if (!sectionId) {
            throw new Error(
              `Unresolved section reference for SYNONYM_ANTONYM_RELATION "${item.clientDraftId}": "${item.sectionClientDraftId}"`,
            );
          }
          return {
            lessonId,
            sectionId,
            primaryWord: item.primaryWord,
            primaryTranslation: item.primaryTranslation,
            synonym: item.synonym,
            synonymTranslation: item.synonymTranslation,
            antonym: item.antonym,
            antonymTranslation: item.antonymTranslation,
            displayOrder: item.displayOrder,
            sourceTableIndex: item.sourceTableIndex,
            sourceRowIndex: item.sourceRowIndex,
          };
        });

      if (relations.length > 0) {
        await tx.vocabularyRelation.createMany({ data: relations });
      }

      const persistedSections: PersistedSectionResult[] = createdSections.map((s) => ({
        id: s.id,
        kind: s.kind,
        title: s.title,
        displayOrder: s.displayOrder,
        sourceTableIndex: s.sourceTableIndex,
        sourceTitleRowIndex: s.sourceTitleRowIndex,
      }));

      return {
        lessonId,
        sectionCount: sections.length,
        standardItemCount: standardItems.length,
        relationCount: relations.length,
        sections: persistedSections,
      };
    });
  }
}
