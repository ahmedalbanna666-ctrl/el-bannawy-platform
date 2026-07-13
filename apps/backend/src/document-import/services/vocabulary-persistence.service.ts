import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

import type {
  VocabularyStructuredDraft,
  VocabularySectionDraft,
} from "../types/vocabulary-structured.types";
import {
  PersistenceValidationException,
  type StructuredVocabularyPersistenceOptions,
  type StructuredVocabularyPersistenceResult,
  type PersistedSectionResult,
  type PersistenceValidationError,
} from "../types/vocabulary-persistence.types";

const MAX_SECTIONS = 50;
const MAX_ITEMS = 500;
const MAX_RELATIONS = 500;
const EXPECTED_PARSER_PROFILE = "VOCABULARY_STRUCTURED_V2";

function isStandardItem(
  item: VocabularyStructuredDraft["items"][number],
): item is import("./../types/vocabulary-structured.types").VocabularyStandardItemDraft {
  return item.kind === "STANDARD_ITEM";
}

function isRelationItem(
  item: VocabularyStructuredDraft["items"][number],
): item is import("./../types/vocabulary-structured.types").VocabularyRelationDraft {
  return item.kind === "SYNONYM_ANTONYM_RELATION";
}

type StandardItem = import("./../types/vocabulary-structured.types").VocabularyStandardItemDraft;
type RelationItem = import("./../types/vocabulary-structured.types").VocabularyRelationDraft;

@Injectable()
export class VocabularyPersistenceService {
  constructor(private readonly prisma: PrismaService) {}

  async persistStructuredVocabulary(
    lessonId: string,
    draft: VocabularyStructuredDraft,
    _options?: StructuredVocabularyPersistenceOptions,
  ): Promise<StructuredVocabularyPersistenceResult> {
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

    return this.executeAtomicPersistence(lessonId, draft);
  }

  private validateLessonId(lessonId: string): void {
    if (!lessonId || lessonId.trim().length === 0) {
      throw new PersistenceValidationException([
        { code: "EMPTY_LESSON_ID", message: "lessonId must be non-empty" },
      ]);
    }
  }

  private validateParserProfile(
    draft: { readonly parserProfile: string },
    errors: PersistenceValidationError[],
  ): void {
    if (draft.parserProfile !== EXPECTED_PARSER_PROFILE) {
      errors.push({
        code: "INVALID_PARSER_PROFILE",
        message: 'Expected parserProfile "' + EXPECTED_PARSER_PROFILE + '", got "' + draft.parserProfile + '"',
      });
    }
  }

  private validateDraft(draft: VocabularyStructuredDraft | null | undefined): void {
    if (draft === null || draft === undefined) {
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
          message: "Section \"" + section.clientDraftId + "\" has negative displayOrder: " + String(section.displayOrder),
          sectionClientDraftId: section.clientDraftId,
        });
      }
    }

    for (const id of duplicateIds) {
      errors.push({
        code: "DUPLICATE_SECTION_CLIENT_DRAFT_ID",
        message: 'Duplicate section clientDraftId: "' + id + '"',
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
    item: VocabularyStructuredDraft["items"][number],
    index: number,
    sectionMap: Map<string, VocabularySectionDraft>,
    errors: PersistenceValidationError[],
  ): void {
    const section = sectionMap.get(item.sectionClientDraftId);
    if (!section) {
      errors.push({
        code: "MISSING_SECTION_REFERENCE",
        message: "Item at index " + String(index) + ' references unknown section "' + item.sectionClientDraftId + '"',
        itemIndex: index,
        itemClientDraftId: item.clientDraftId,
        sectionClientDraftId: item.sectionClientDraftId,
      });
      return;
    }

    if (item.displayOrder < 0) {
      errors.push({
        code: "NEGATIVE_ITEM_DISPLAY_ORDER",
        message: "Item \"" + item.clientDraftId + "\" has negative displayOrder: " + String(item.displayOrder),
        itemIndex: index,
        itemClientDraftId: item.clientDraftId,
      });
    }

    if (isStandardItem(item)) {
      this.validateStandardItem(item, index, section, errors);
    } else if (isRelationItem(item)) {
      this.validateRelationItem(item, index, section, errors);
    }
  }

  private validateStandardItem(
    item: StandardItem,
    index: number,
    section: VocabularySectionDraft,
    errors: PersistenceValidationError[],
  ): void {
    if (section.kind !== "STANDARD_VOCABULARY") {
      errors.push({
        code: "STANDARD_ITEM_IN_WRONG_SECTION_KIND",
        message: 'STANDARD_ITEM "' + item.clientDraftId + '" references SYNONYM_ANTONYM section "' + section.clientDraftId + '"',
        itemIndex: index,
        itemClientDraftId: item.clientDraftId,
        sectionClientDraftId: item.sectionClientDraftId,
      });
    }

    if (!item.word || item.word.trim().length === 0) {
      errors.push({
        code: "EMPTY_STANDARD_WORD",
        message: 'STANDARD_ITEM "' + item.clientDraftId + '" has empty word',
        itemIndex: index,
        itemClientDraftId: item.clientDraftId,
      });
    }

    if (!item.translation || item.translation.trim().length === 0) {
      errors.push({
        code: "EMPTY_STANDARD_TRANSLATION",
        message: 'STANDARD_ITEM "' + item.clientDraftId + '" has empty translation',
        itemIndex: index,
        itemClientDraftId: item.clientDraftId,
      });
    }

    if (item.status === "INVALID") {
      errors.push({
        code: "INVALID_ITEM_REJECTED",
        message: 'STANDARD_ITEM "' + item.clientDraftId + '" is INVALID',
        itemIndex: index,
        itemClientDraftId: item.clientDraftId,
      });
    }
  }

  private validateRelationItem(
    item: RelationItem,
    index: number,
    section: VocabularySectionDraft,
    errors: PersistenceValidationError[],
  ): void {
    if (section.kind !== "SYNONYM_ANTONYM") {
      errors.push({
        code: "RELATION_IN_WRONG_SECTION_KIND",
        message: 'SYNONYM_ANTONYM_RELATION "' + item.clientDraftId + '" references STANDARD_VOCABULARY section "' + section.clientDraftId + '"',
        itemIndex: index,
        itemClientDraftId: item.clientDraftId,
        sectionClientDraftId: item.sectionClientDraftId,
      });
    }

    if (!item.primaryWord || item.primaryWord.trim().length === 0) {
      errors.push({
        code: "EMPTY_RELATION_PRIMARY_WORD",
        message: 'SYNONYM_ANTONYM_RELATION "' + item.clientDraftId + '" has empty primaryWord',
        itemIndex: index,
        itemClientDraftId: item.clientDraftId,
      });
    }

    if (!item.primaryTranslation || item.primaryTranslation.trim().length === 0) {
      errors.push({
        code: "EMPTY_RELATION_PRIMARY_TRANSLATION",
        message: 'SYNONYM_ANTONYM_RELATION "' + item.clientDraftId + '" has empty primaryTranslation',
        itemIndex: index,
        itemClientDraftId: item.clientDraftId,
      });
    }

    if (item.status === "INVALID") {
      errors.push({
        code: "INVALID_ITEM_REJECTED",
        message: 'SYNONYM_ANTONYM_RELATION "' + item.clientDraftId + '" is INVALID',
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
        message: "Maximum " + String(MAX_SECTIONS) + " sections allowed, got " + String(draft.sections.length),
      });
    }

    const standardCount = draft.items.filter(isStandardItem).length;
    if (standardCount > MAX_ITEMS) {
      errors.push({
        code: "TOO_MANY_STANDARD_ITEMS",
        message: "Maximum " + String(MAX_ITEMS) + " standard items allowed, got " + String(standardCount),
      });
    }

    const relationCount = draft.items.filter(isRelationItem).length;
    if (relationCount > MAX_RELATIONS) {
      errors.push({
        code: "TOO_MANY_RELATIONS",
        message: "Maximum " + String(MAX_RELATIONS) + " relations allowed, got " + String(relationCount),
      });
    }
  }

  private async executeAtomicPersistence(
    lessonId: string,
    draft: VocabularyStructuredDraft,
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
        kind: s.kind,
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

      const standardItems: {
        lessonId: string;
        sectionId: string;
        word: string;
        translation: string;
        definition: string | null;
        example: string | null;
        partOfSpeech: string | null;
        displayOrder: number;
        sourceTableIndex: number;
        sourceRowIndex: number;
        sourcePairIndex: number;
      }[] = [];

      for (const item of draft.items) {
        if (!isStandardItem(item)) {
          continue;
        }
        const sectionId = clientIdToDbId.get(item.sectionClientDraftId);
        if (!sectionId) {
          throw new Error(
            'Unresolved section reference for STANDARD_ITEM "' + item.clientDraftId + '": "' + item.sectionClientDraftId + '"',
          );
        }
        standardItems.push({
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
        });
      }

      if (standardItems.length > 0) {
        await tx.lessonVocabulary.createMany({ data: standardItems });
      }

      const relations: {
        lessonId: string;
        sectionId: string;
        primaryWord: string;
        primaryTranslation: string;
        synonym: string | null;
        synonymTranslation: string | null;
        antonym: string | null;
        antonymTranslation: string | null;
        displayOrder: number;
        sourceTableIndex: number;
        sourceRowIndex: number;
      }[] = [];

      for (const item of draft.items) {
        if (!isRelationItem(item)) {
          continue;
        }
        const sectionId = clientIdToDbId.get(item.sectionClientDraftId);
        if (!sectionId) {
          throw new Error(
            'Unresolved section reference for SYNONYM_ANTONYM_RELATION "' + item.clientDraftId + '": "' + item.sectionClientDraftId + '"',
          );
        }
        relations.push({
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
        });
      }

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
