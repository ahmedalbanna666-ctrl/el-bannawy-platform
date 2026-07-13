import { Test, TestingModule } from "@nestjs/testing";
import { VocabularyPersistenceService } from "./vocabulary-persistence.service";
import { PrismaService } from "../../prisma/prisma.service";
import { PersistenceValidationException } from "../types/vocabulary-persistence.types";
import type { VocabularyStructuredDraft } from "../types/vocabulary-structured.types";
import type { VocabularySectionKind } from "@prisma/client";

function createSection(overrides: Partial<{
  clientDraftId: string;
  kind: "STANDARD_VOCABULARY" | "SYNONYM_ANTONYM";
  title: string | null;
  displayOrder: number;
  sourceTableIndex: number;
  sourceTitleRowIndex: number | null;
}> = {}) {
  return {
    clientDraftId: "sec-1",
    kind: "STANDARD_VOCABULARY" as const,
    title: null,
    displayOrder: 0,
    sourceTableIndex: 0,
    sourceTitleRowIndex: null,
    ...overrides,
  };
}

function createStandardItem(overrides: Partial<{
  clientDraftId: string;
  sectionClientDraftId: string;
  word: string;
  translation: string;
  definition: string | null;
  example: string | null;
  partOfSpeech: string | null;
  displayOrder: number;
  sourceTableIndex: number;
  sourceRowIndex: number;
  sourcePairIndex: 0 | 1;
  status: "VALID" | "WARNING" | "INVALID";
  warnings: readonly string[];
  errors: readonly string[];
}> = {}) {
  return {
    kind: "STANDARD_ITEM" as const,
    clientDraftId: "item-1",
    sectionClientDraftId: "sec-1",
    word: "hello",
    translation: "مرحبا",
    definition: null,
    example: null,
    partOfSpeech: null,
    displayOrder: 0,
    sourceTableIndex: 0,
    sourceRowIndex: 1,
    sourcePairIndex: 0 as const,
    status: "VALID" as const,
    warnings: [],
    errors: [],
    ...overrides,
  };
}

function createRelationItem(overrides: Partial<{
  clientDraftId: string;
  sectionClientDraftId: string;
  primaryWord: string;
  primaryTranslation: string;
  synonym: string | null;
  synonymTranslation: string | null;
  antonym: string | null;
  antonymTranslation: string | null;
  displayOrder: number;
  sourceTableIndex: number;
  sourceRowIndex: number;
  status: "VALID" | "WARNING" | "INVALID";
  warnings: readonly string[];
  errors: readonly string[];
}> = {}) {
  return {
    kind: "SYNONYM_ANTONYM_RELATION" as const,
    clientDraftId: "rel-1",
    sectionClientDraftId: "sec-rel",
    primaryWord: "big",
    primaryTranslation: "كبير",
    synonym: null,
    synonymTranslation: null,
    antonym: null,
    antonymTranslation: null,
    displayOrder: 0,
    sourceTableIndex: 0,
    sourceRowIndex: 1,
    status: "VALID" as const,
    warnings: [],
    errors: [],
    ...overrides,
  };
}

function createDraft(overrides: Partial<{
  sections: ReturnType<typeof createSection>[];
  items: (ReturnType<typeof createStandardItem> | ReturnType<typeof createRelationItem>)[];
}> = {}): VocabularyStructuredDraft {
  return {
    parserProfile: "VOCABULARY_STRUCTURED_V2",
    sections: overrides.sections ?? [createSection()],
    items: overrides.items ?? [createStandardItem()],
    counts: { total: 1, valid: 1, warning: 0, invalid: 0 },
    warnings: [],
    errors: [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTx = any;

type MockPrismaTransaction = {
  vocabularySection: {
    create: jest.Mock;
    deleteMany: jest.Mock;
  };
  vocabularyRelation: {
    createMany: jest.Mock;
    deleteMany: jest.Mock;
  };
  lessonVocabulary: {
    createMany: jest.Mock;
    deleteMany: jest.Mock;
  };
};

type MockPrismaService = {
  $transaction: jest.Mock;
};

function createMockPrisma(): MockPrismaService {
  return {
    $transaction: jest.fn(),
  };
}

function createMockTx(): MockPrismaTransaction {
  return {
    vocabularySection: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    vocabularyRelation: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    lessonVocabulary: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

describe("VocabularyPersistenceService", () => {
  let service: VocabularyPersistenceService;
  let prisma: MockPrismaService;

  const lessonId = "00000000-0000-0000-0000-000000000001";

  beforeEach(async () => {
    prisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VocabularyPersistenceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<VocabularyPersistenceService>(VocabularyPersistenceService);
  });

  describe("A — Validation", () => {
    it("rejects empty lessonId", async () => {
      const draft = createDraft();
      await expect(service.persistStructuredVocabulary("", draft)).rejects.toThrow(PersistenceValidationException);
    });

    it("rejects wrong parserProfile", async () => {
      const draft = createDraft();
      const badDraft = { ...draft, parserProfile: "VOCABULARY_TABLE_V1" } as unknown as VocabularyStructuredDraft;
      await expect(service.persistStructuredVocabulary(lessonId, badDraft)).rejects.toThrow(PersistenceValidationException);
    });

    it("rejects duplicate section clientDraftId", async () => {
      const draft = createDraft({
        sections: [
          createSection({ clientDraftId: "sec-1" }),
          createSection({ clientDraftId: "sec-1", displayOrder: 1 }),
        ],
        items: [
          createStandardItem({ sectionClientDraftId: "sec-1", clientDraftId: "item-1" }),
          createStandardItem({ sectionClientDraftId: "sec-1", clientDraftId: "item-2", displayOrder: 1 }),
        ],
      });
      await expect(service.persistStructuredVocabulary(lessonId, draft)).rejects.toThrow(PersistenceValidationException);
    });

    it("rejects missing section reference", async () => {
      const draft = createDraft({
        items: [
          createStandardItem({ sectionClientDraftId: "nonexistent" }),
        ],
      });
      await expect(service.persistStructuredVocabulary(lessonId, draft)).rejects.toThrow(PersistenceValidationException);
    });

    it("rejects STANDARD_ITEM referencing SYNONYM_ANTONYM section", async () => {
      const draft = createDraft({
        sections: [createSection({ clientDraftId: "sec-rel", kind: "SYNONYM_ANTONYM", title: "Synonyms" })],
        items: [
          createStandardItem({ sectionClientDraftId: "sec-rel" }),
        ],
      });
      await expect(service.persistStructuredVocabulary(lessonId, draft)).rejects.toThrow(PersistenceValidationException);
    });

    it("rejects RELATION referencing STANDARD_VOCABULARY section", async () => {
      const draft = createDraft({
        sections: [createSection({ clientDraftId: "sec-1" })],
        items: [
          createRelationItem({ sectionClientDraftId: "sec-1" }),
        ],
      });
      await expect(service.persistStructuredVocabulary(lessonId, draft)).rejects.toThrow(PersistenceValidationException);
    });

    it("rejects empty standard word", async () => {
      const draft = createDraft({
        items: [createStandardItem({ word: "" })],
      });
      await expect(service.persistStructuredVocabulary(lessonId, draft)).rejects.toThrow(PersistenceValidationException);
    });

    it("rejects empty standard translation", async () => {
      const draft = createDraft({
        items: [createStandardItem({ translation: "" })],
      });
      await expect(service.persistStructuredVocabulary(lessonId, draft)).rejects.toThrow(PersistenceValidationException);
    });

    it("rejects empty relation primaryWord", async () => {
      const draft = createDraft({
        sections: [createSection({ clientDraftId: "sec-rel", kind: "SYNONYM_ANTONYM", title: "Synonyms" })],
        items: [createRelationItem({ primaryWord: "" })],
      });
      await expect(service.persistStructuredVocabulary(lessonId, draft)).rejects.toThrow(PersistenceValidationException);
    });

    it("rejects empty relation primaryTranslation", async () => {
      const draft = createDraft({
        sections: [createSection({ clientDraftId: "sec-rel", kind: "SYNONYM_ANTONYM", title: "Synonyms" })],
        items: [createRelationItem({ primaryTranslation: "" })],
      });
      await expect(service.persistStructuredVocabulary(lessonId, draft)).rejects.toThrow(PersistenceValidationException);
    });

    it("rejects entire draft when an item is INVALID", async () => {
      const draft = createDraft({
        items: [createStandardItem({ status: "INVALID" })],
      });
      await expect(service.persistStructuredVocabulary(lessonId, draft)).rejects.toThrow(PersistenceValidationException);
    });

    it("persists WARNING items", async () => {
      const tx = createMockTx();
      tx.vocabularySection.create.mockResolvedValue({
        id: "db-sec-1",
        kind: "STANDARD_VOCABULARY",
        title: null,
        displayOrder: 0,
        sourceTableIndex: 0,
        sourceTitleRowIndex: null,
      });
      prisma.$transaction.mockImplementation(async (cb: (tx: AnyTx) => unknown) => cb(tx) as Promise<unknown>);

      const draft = createDraft({
        items: [createStandardItem({ status: "WARNING", warnings: ["Ambiguous pair data"] })],
      });

      const result = await service.persistStructuredVocabulary(lessonId, draft);
      expect(result.standardItemCount).toBe(1);
    });

    it("rejects negative section displayOrder", async () => {
      const draft = createDraft({
        sections: [createSection({ displayOrder: -1 })],
      });
      await expect(service.persistStructuredVocabulary(lessonId, draft)).rejects.toThrow(PersistenceValidationException);
    });

    it("rejects negative item displayOrder", async () => {
      const draft = createDraft({
        items: [createStandardItem({ displayOrder: -1 })],
      });
      await expect(service.persistStructuredVocabulary(lessonId, draft)).rejects.toThrow(PersistenceValidationException);
    });
  });

  describe("B — Persistence", () => {
    it("creates all sections", async () => {
      const tx = createMockTx();
      tx.vocabularySection.create
        .mockResolvedValueOnce({ id: "db-sec-1", kind: "STANDARD_VOCABULARY", title: null, displayOrder: 0, sourceTableIndex: 0, sourceTitleRowIndex: null })
        .mockResolvedValueOnce({ id: "db-sec-2", kind: "STANDARD_VOCABULARY", title: "Vocabulary List 2", displayOrder: 1, sourceTableIndex: 1, sourceTitleRowIndex: null });
      prisma.$transaction.mockImplementation(async (cb: (tx: AnyTx) => unknown) => cb(tx) as Promise<unknown>);

      const draft = createDraft({
        sections: [
          createSection({ clientDraftId: "sec-1", displayOrder: 0 }),
          createSection({ clientDraftId: "sec-2", title: "Vocabulary List 2", displayOrder: 1, sourceTableIndex: 1 }),
        ],
        items: [
          createStandardItem({ clientDraftId: "item-1", sectionClientDraftId: "sec-1", displayOrder: 0 }),
          createStandardItem({ clientDraftId: "item-2", sectionClientDraftId: "sec-2", displayOrder: 0 }),
        ],
      });

      const result = await service.persistStructuredVocabulary(lessonId, draft);
      expect(result.sectionCount).toBe(2);
      expect(tx.vocabularySection.create).toHaveBeenCalledTimes(2);
    });

    it("persists nullable section titles", async () => {
      const tx = createMockTx();
      tx.vocabularySection.create
        .mockResolvedValueOnce({ id: "db-sec-1", kind: "SYNONYM_ANTONYM", title: null, displayOrder: 0, sourceTableIndex: 0, sourceTitleRowIndex: null })
        .mockResolvedValueOnce({ id: "db-sec-2", kind: "STANDARD_VOCABULARY", title: "Named Section", displayOrder: 1, sourceTableIndex: 1, sourceTitleRowIndex: null });
      prisma.$transaction.mockImplementation(async (cb: (tx: AnyTx) => unknown) => cb(tx) as Promise<unknown>);

      const draft = createDraft({
        sections: [
          createSection({ clientDraftId: "sec-1", kind: "SYNONYM_ANTONYM", title: null }),
          createSection({ clientDraftId: "sec-2", title: "Named Section", sourceTableIndex: 1 }),
        ],
        items: [
          createStandardItem({ clientDraftId: "item-1", sectionClientDraftId: "sec-2" }),
        ],
      });

      const result = await service.persistStructuredVocabulary(lessonId, draft);
      expect(result.sections[0].title).toBeNull();
      expect(result.sections[1].title).toBe("Named Section");
    });

    it("persists standard vocabulary items with sectionId", async () => {
      const tx = createMockTx();
      tx.vocabularySection.create.mockResolvedValue({
        id: "db-sec-1",
        kind: "STANDARD_VOCABULARY",
        title: null,
        displayOrder: 0,
        sourceTableIndex: 0,
        sourceTitleRowIndex: null,
      });
      prisma.$transaction.mockImplementation(async (cb: (tx: AnyTx) => unknown) => cb(tx) as Promise<unknown>);

      const draft = createDraft({
        items: [
          createStandardItem({ clientDraftId: "item-1", word: "hello", translation: "مرحبا" }),
          createStandardItem({ clientDraftId: "item-2", word: "book", translation: "كتاب", displayOrder: 1, sourceRowIndex: 2 }),
        ],
      });

      const result = await service.persistStructuredVocabulary(lessonId, draft);
      expect(result.standardItemCount).toBe(2);
      expect(tx.lessonVocabulary.createMany).toHaveBeenCalled();
      const callData = (tx.lessonVocabulary.createMany as jest.Mock).mock.calls[0][0].data;
      expect(callData[0].sectionId).toBe("db-sec-1");
      expect(callData[1].sectionId).toBe("db-sec-1");
    });

    it("persists source metadata", async () => {
      const tx = createMockTx();
      tx.vocabularySection.create.mockResolvedValue({
        id: "db-sec-1",
        kind: "STANDARD_VOCABULARY",
        title: null,
        displayOrder: 0,
        sourceTableIndex: 0,
        sourceTitleRowIndex: null,
      });
      prisma.$transaction.mockImplementation(async (cb: (tx: AnyTx) => unknown) => cb(tx) as Promise<unknown>);

      const draft = createDraft({
        items: [
          createStandardItem({
            clientDraftId: "item-1",
            sourceTableIndex: 0,
            sourceRowIndex: 3,
            sourcePairIndex: 0,
          }),
        ],
      });

      await service.persistStructuredVocabulary(lessonId, draft);
      const callData = (tx.lessonVocabulary.createMany as jest.Mock).mock.calls[0][0].data;
      expect(callData[0].sourceTableIndex).toBe(0);
      expect(callData[0].sourceRowIndex).toBe(3);
      expect(callData[0].sourcePairIndex).toBe(0);
    });

    it("persists all six relation semantic fields", async () => {
      const tx = createMockTx();
      tx.vocabularySection.create.mockResolvedValue({
        id: "db-sec-rel",
        kind: "SYNONYM_ANTONYM",
        title: "Synonyms",
        displayOrder: 0,
        sourceTableIndex: 2,
        sourceTitleRowIndex: null,
      });
      prisma.$transaction.mockImplementation(async (cb: (tx: AnyTx) => unknown) => cb(tx) as Promise<unknown>);

      const draft = createDraft({
        sections: [createSection({ clientDraftId: "sec-rel", kind: "SYNONYM_ANTONYM", title: "Synonyms", sourceTableIndex: 2 })],
        items: [
          createRelationItem({
            clientDraftId: "rel-1",
            sectionClientDraftId: "sec-rel",
            primaryWord: "happy",
            primaryTranslation: "سعيد",
            synonym: "joyful",
            synonymTranslation: "مبتهج",
            antonym: "sad",
            antonymTranslation: "حزين",
          }),
        ],
      });

      await service.persistStructuredVocabulary(lessonId, draft);
      const callData = (tx.vocabularyRelation.createMany as jest.Mock).mock.calls[0][0].data;
      expect(callData[0].primaryWord).toBe("happy");
      expect(callData[0].primaryTranslation).toBe("سعيد");
      expect(callData[0].synonym).toBe("joyful");
      expect(callData[0].synonymTranslation).toBe("مبتهج");
      expect(callData[0].antonym).toBe("sad");
      expect(callData[0].antonymTranslation).toBe("حزين");
    });

    it("preserves raw concatenated relation text exactly", async () => {
      const tx = createMockTx();
      tx.vocabularySection.create.mockResolvedValue({
        id: "db-sec-rel",
        kind: "SYNONYM_ANTONYM",
        title: null,
        displayOrder: 0,
        sourceTableIndex: 2,
        sourceTitleRowIndex: null,
      });
      prisma.$transaction.mockImplementation(async (cb: (tx: AnyTx) => unknown) => cb(tx) as Promise<unknown>);

      const draft = createDraft({
        sections: [createSection({ clientDraftId: "sec-rel", kind: "SYNONYM_ANTONYM", sourceTableIndex: 2 })],
        items: [
          createRelationItem({
            primaryWord: "commitment",
            primaryTranslation: "التزام - تفان",
            synonym: "dedication - devotion",
            synonymTranslation: "إخلاص - تفاني",
          }),
        ],
      });

      await service.persistStructuredVocabulary(lessonId, draft);
      const callData = (tx.vocabularyRelation.createMany as jest.Mock).mock.calls[0][0].data;
      expect(callData[0].primaryTranslation).toBe("التزام - تفان");
      expect(callData[0].synonym).toBe("dedication - devotion");
      expect(callData[0].synonymTranslation).toBe("إخلاص - تفاني");
    });

    it("creates correct section linkage", async () => {
      const tx = createMockTx();
      tx.vocabularySection.create
        .mockResolvedValueOnce({ id: "db-sec-1", kind: "STANDARD_VOCABULARY", title: null, displayOrder: 0, sourceTableIndex: 0, sourceTitleRowIndex: null })
        .mockResolvedValueOnce({ id: "db-sec-2", kind: "STANDARD_VOCABULARY", title: "List 2", displayOrder: 1, sourceTableIndex: 1, sourceTitleRowIndex: null });
      prisma.$transaction.mockImplementation(async (cb: (tx: AnyTx) => unknown) => cb(tx) as Promise<unknown>);

      const draft = createDraft({
        sections: [
          createSection({ clientDraftId: "sec-1", displayOrder: 0 }),
          createSection({ clientDraftId: "sec-2", title: "List 2", displayOrder: 1, sourceTableIndex: 1 }),
        ],
        items: [
          createStandardItem({ clientDraftId: "item-1", sectionClientDraftId: "sec-1", word: "cat", translation: "قطة" }),
          createStandardItem({ clientDraftId: "item-2", sectionClientDraftId: "sec-2", word: "dog", translation: "كلب" }),
        ],
      });

      await service.persistStructuredVocabulary(lessonId, draft);
      const callData = (tx.lessonVocabulary.createMany as jest.Mock).mock.calls[0][0].data;
      expect(callData[0].sectionId).toBe("db-sec-1");
      expect(callData[1].sectionId).toBe("db-sec-2");
    });

    it("preserves source order through displayOrder", async () => {
      const tx = createMockTx();
      tx.vocabularySection.create
        .mockResolvedValueOnce({ id: "db-sec-1", kind: "STANDARD_VOCABULARY", title: null, displayOrder: 0, sourceTableIndex: 0, sourceTitleRowIndex: null })
        .mockResolvedValueOnce({ id: "db-sec-2", kind: "STANDARD_VOCABULARY", title: null, displayOrder: 1, sourceTableIndex: 1, sourceTitleRowIndex: null });
      prisma.$transaction.mockImplementation(async (cb: (tx: AnyTx) => unknown) => cb(tx) as Promise<unknown>);

      const draft = createDraft({
        sections: [
          createSection({ clientDraftId: "sec-1", displayOrder: 1 }),
          createSection({ clientDraftId: "sec-2", displayOrder: 0 }),
        ],
        items: [
          createStandardItem({ clientDraftId: "item-1", sectionClientDraftId: "sec-2", displayOrder: 1 }),
          createStandardItem({ clientDraftId: "item-2", sectionClientDraftId: "sec-1", displayOrder: 0 }),
          createStandardItem({ clientDraftId: "item-3", sectionClientDraftId: "sec-2", displayOrder: 0 }),
        ],
      });

      await service.persistStructuredVocabulary(lessonId, draft);
      const callData = (tx.lessonVocabulary.createMany as jest.Mock).mock.calls[0][0].data;
      expect(callData[0].sectionId).toBe("db-sec-2");
      expect(callData[0].displayOrder).toBe(1);
      expect(callData[1].sectionId).toBe("db-sec-1");
      expect(callData[1].displayOrder).toBe(0);
      expect(callData[2].sectionId).toBe("db-sec-2");
      expect(callData[2].displayOrder).toBe(0);
    });

    it("returns correct counts", async () => {
      const tx = createMockTx();
      tx.vocabularySection.create
        .mockResolvedValueOnce({ id: "db-sec-1", kind: "STANDARD_VOCABULARY", title: null, displayOrder: 0, sourceTableIndex: 0, sourceTitleRowIndex: null })
        .mockResolvedValueOnce({ id: "db-sec-2", kind: "SYNONYM_ANTONYM", title: "Synonyms", displayOrder: 1, sourceTableIndex: 2, sourceTitleRowIndex: null });
      prisma.$transaction.mockImplementation(async (cb: (tx: AnyTx) => unknown) => cb(tx) as Promise<unknown>);

      const draft = createDraft({
        sections: [
          createSection({ clientDraftId: "sec-1" }),
          createSection({ clientDraftId: "sec-rel", kind: "SYNONYM_ANTONYM", title: "Synonyms", sourceTableIndex: 2 }),
        ],
        items: [
          createStandardItem({ clientDraftId: "item-1", sectionClientDraftId: "sec-1" }),
          createStandardItem({ clientDraftId: "item-2", sectionClientDraftId: "sec-1", displayOrder: 1 }),
          createStandardItem({ clientDraftId: "item-3", sectionClientDraftId: "sec-1", displayOrder: 2 }),
          createRelationItem({ clientDraftId: "rel-1", sectionClientDraftId: "sec-rel" }),
          createRelationItem({ clientDraftId: "rel-2", sectionClientDraftId: "sec-rel", displayOrder: 1 }),
        ],
      });

      const result = await service.persistStructuredVocabulary(lessonId, draft);
      expect(result.sectionCount).toBe(2);
      expect(result.standardItemCount).toBe(3);
      expect(result.relationCount).toBe(2);
      expect(result.lessonId).toBe(lessonId);
    });
  });

  describe("C — Replacement policy", () => {
    it("deletes old relations", async () => {
      const tx = createMockTx();
      tx.vocabularySection.create.mockResolvedValue({
        id: "db-sec-1",
        kind: "STANDARD_VOCABULARY",
        title: null,
        displayOrder: 0,
        sourceTableIndex: 0,
        sourceTitleRowIndex: null,
      });
      prisma.$transaction.mockImplementation(async (cb: (tx: AnyTx) => unknown) => cb(tx) as Promise<unknown>);

      const draft = createDraft();
      await service.persistStructuredVocabulary(lessonId, draft);

      expect(tx.vocabularyRelation.deleteMany).toHaveBeenCalledWith({ where: { lessonId } });
    });

    it("deletes old structured vocabulary rows", async () => {
      const tx = createMockTx();
      tx.vocabularySection.create.mockResolvedValue({
        id: "db-sec-1",
        kind: "STANDARD_VOCABULARY",
        title: null,
        displayOrder: 0,
        sourceTableIndex: 0,
        sourceTitleRowIndex: null,
      });
      prisma.$transaction.mockImplementation(async (cb: (tx: AnyTx) => unknown) => cb(tx) as Promise<unknown>);

      const draft = createDraft();
      await service.persistStructuredVocabulary(lessonId, draft);

      expect(tx.lessonVocabulary.deleteMany).toHaveBeenCalledWith({
        where: { lessonId, sectionId: { not: null } },
      });
    });

    it("deletes old sections", async () => {
      const tx = createMockTx();
      tx.vocabularySection.create.mockResolvedValue({
        id: "db-sec-1",
        kind: "STANDARD_VOCABULARY",
        title: null,
        displayOrder: 0,
        sourceTableIndex: 0,
        sourceTitleRowIndex: null,
      });
      prisma.$transaction.mockImplementation(async (cb: (tx: AnyTx) => unknown) => cb(tx) as Promise<unknown>);

      const draft = createDraft();
      await service.persistStructuredVocabulary(lessonId, draft);

      expect(tx.vocabularySection.deleteMany).toHaveBeenCalledWith({ where: { lessonId } });
    });

    it("does not delete manual vocabulary (sectionId IS NULL)", async () => {
      const tx = createMockTx();
      tx.vocabularySection.create.mockResolvedValue({
        id: "db-sec-1",
        kind: "STANDARD_VOCABULARY",
        title: null,
        displayOrder: 0,
        sourceTableIndex: 0,
        sourceTitleRowIndex: null,
      });
      prisma.$transaction.mockImplementation(async (cb: (tx: AnyTx) => unknown) => cb(tx) as Promise<unknown>);

      const draft = createDraft();
      await service.persistStructuredVocabulary(lessonId, draft);

      const deleteArgs = (tx.lessonVocabulary.deleteMany as jest.Mock).mock.calls[0][0];
      expect(deleteArgs.where.sectionId).toEqual({ not: null });
    });

    it("replaces structured data deterministically", async () => {
      const tx = createMockTx();
      tx.vocabularySection.create.mockResolvedValue({
        id: "db-sec-1",
        kind: "STANDARD_VOCABULARY",
        title: null,
        displayOrder: 0,
        sourceTableIndex: 0,
        sourceTitleRowIndex: null,
      });
      prisma.$transaction.mockImplementation(async (cb: (tx: AnyTx) => unknown) => cb(tx) as Promise<unknown>);

      const draft = createDraft();
      await service.persistStructuredVocabulary(lessonId, draft);

      expect(tx.lessonVocabulary.deleteMany).toHaveBeenCalled();
      expect(tx.vocabularyRelation.deleteMany).toHaveBeenCalled();
      expect(tx.vocabularySection.deleteMany).toHaveBeenCalled();
      expect(tx.vocabularySection.create).toHaveBeenCalled();
    });

    it("repeated REPLACE_STRUCTURED does not duplicate structured data", async () => {
      let callCount = 0;
      const tx = createMockTx();
      tx.vocabularySection.create.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          id: `db-sec-${callCount}`,
          kind: "STANDARD_VOCABULARY",
          title: null,
          displayOrder: 0,
          sourceTableIndex: 0,
          sourceTitleRowIndex: null,
        });
      });
      prisma.$transaction.mockImplementation(async (cb: (tx: AnyTx) => unknown) => cb(tx) as Promise<unknown>);

      const draft = createDraft();
      await service.persistStructuredVocabulary(lessonId, draft);
      await service.persistStructuredVocabulary(lessonId, draft);

      expect(tx.vocabularySection.create).toHaveBeenCalledTimes(2);
      expect(tx.lessonVocabulary.createMany).toHaveBeenCalledTimes(2);
      const firstDeleteCount = (tx.lessonVocabulary.deleteMany as jest.Mock).mock.calls.length;
      expect(firstDeleteCount).toBe(2);
    });
  });

  describe("D — Transactional integrity", () => {
    it("returns result from transaction callback", async () => {
      const tx = createMockTx();
      tx.vocabularySection.create.mockResolvedValue({
        id: "db-sec-1",
        kind: "STANDARD_VOCABULARY",
        title: null,
        displayOrder: 0,
        sourceTableIndex: 0,
        sourceTitleRowIndex: null,
      });
      prisma.$transaction.mockImplementation(async (cb: (tx: AnyTx) => unknown) => cb(tx) as Promise<unknown>);

      const draft = createDraft();
      const result = await service.persistStructuredVocabulary(lessonId, draft);
      expect(result.lessonId).toBe(lessonId);
      expect(result.sectionCount).toBe(1);
      expect(result.standardItemCount).toBe(1);
    });

    it("throws when section creation fails", async () => {
      const tx = createMockTx();
      tx.vocabularySection.create.mockRejectedValue(new Error("DB section failure"));
      prisma.$transaction.mockImplementation(async (cb: (tx: AnyTx) => unknown) => cb(tx) as Promise<unknown>);

      const draft = createDraft();
      await expect(service.persistStructuredVocabulary(lessonId, draft)).rejects.toThrow("DB section failure");
    });

    it("throws when standard item creation fails", async () => {
      const tx = createMockTx();
      tx.vocabularySection.create.mockResolvedValue({
        id: "db-sec-1",
        kind: "STANDARD_VOCABULARY",
        title: null,
        displayOrder: 0,
        sourceTableIndex: 0,
        sourceTitleRowIndex: null,
      });
      tx.lessonVocabulary.createMany.mockRejectedValue(new Error("DB item failure"));
      prisma.$transaction.mockImplementation(async (cb: (tx: AnyTx) => unknown) => cb(tx) as Promise<unknown>);

      const draft = createDraft();
      await expect(service.persistStructuredVocabulary(lessonId, draft)).rejects.toThrow("DB item failure");
    });

    it("throws when relation creation fails", async () => {
      const tx = createMockTx();
      tx.vocabularySection.create.mockResolvedValue({
        id: "db-sec-rel",
        kind: "SYNONYM_ANTONYM",
        title: "Synonyms",
        displayOrder: 0,
        sourceTableIndex: 2,
        sourceTitleRowIndex: null,
      });
      tx.lessonVocabulary.createMany.mockResolvedValue({ count: 0 });
      tx.vocabularyRelation.createMany.mockRejectedValue(new Error("DB relation failure"));
      prisma.$transaction.mockImplementation(async (cb: (tx: AnyTx) => unknown) => cb(tx) as Promise<unknown>);

      const draft = createDraft({
        sections: [createSection({ clientDraftId: "sec-rel", kind: "SYNONYM_ANTONYM", title: "Synonyms", sourceTableIndex: 2 })],
        items: [createRelationItem({ sectionClientDraftId: "sec-rel" })],
      });

      await expect(service.persistStructuredVocabulary(lessonId, draft)).rejects.toThrow("DB relation failure");
    });
  });

  describe("E — Real DOCX acceptance (contract validation)", () => {
    it("validates null draft is rejected", async () => {
      await expect(service.persistStructuredVocabulary(lessonId, null as unknown as VocabularyStructuredDraft)).rejects.toThrow();
    });
  });
});
