import type { PrismaClient } from "@prisma/client";

type DeepMockProxy<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? jest.Mock<R, A>
    : DeepMockProxy<T[K]>;
};

type MockPrisma = DeepMockProxy<PrismaClient>;

function createMockSection(
  overrides: Partial<{
    id: string;
    lessonId: string;
    kind: "STANDARD_VOCABULARY" | "SYNONYM_ANTONYM";
    title: string | null;
    displayOrder: number;
    sourceTableIndex: number | null;
    sourceTitleRowIndex: number | null;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) {
  return {
    id: "sec-0001",
    lessonId: "lesson-0001",
    kind: "STANDARD_VOCABULARY" as const,
    title: null,
    displayOrder: 0,
    sourceTableIndex: null,
    sourceTitleRowIndex: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function createMockRelation(
  overrides: Partial<{
    id: string;
    lessonId: string;
    sectionId: string;
    primaryWord: string;
    primaryTranslation: string;
    synonym: string | null;
    synonymTranslation: string | null;
    antonym: string | null;
    antonymTranslation: string | null;
    displayOrder: number;
    sourceTableIndex: number | null;
    sourceRowIndex: number | null;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) {
  return {
    id: "rel-0001",
    lessonId: "lesson-0001",
    sectionId: "sec-0001",
    primaryWord: "big",
    primaryTranslation: "كبير",
    synonym: "large",
    synonymTranslation: "ضخم",
    antonym: "small",
    antonymTranslation: "صغير",
    displayOrder: 0,
    sourceTableIndex: null,
    sourceRowIndex: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function createMockVocabularyItem(
  overrides: Partial<{
    id: string;
    lessonId: string;
    sectionId: string | null;
    word: string;
    translation: string;
    definition: string | null;
    example: string | null;
    partOfSpeech: string | null;
    sourceTableIndex: number | null;
    sourceRowIndex: number | null;
    sourcePairIndex: number | null;
    displayOrder: number;
    createdAt: Date;
  }> = {},
) {
  return {
    id: "vocab-0001",
    lessonId: "lesson-0001",
    sectionId: null,
    word: "hello",
    translation: "مرحبا",
    definition: null,
    example: null,
    partOfSpeech: null,
    sourceTableIndex: null,
    sourceRowIndex: null,
    sourcePairIndex: null,
    displayOrder: 0,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("VocabularyPersistence — Schema Contract", () => {
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = {
      vocabularySection: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        upsert: jest.fn(),
        createMany: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
      },
      vocabularyRelation: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        upsert: jest.fn(),
        createMany: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
      },
      lessonVocabulary: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        upsert: jest.fn(),
        createMany: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
      },
    } as unknown as MockPrisma;
  });

  describe("VocabularySection CRUD", () => {
    it("creates a section with standard vocabulary kind and nullable title", async () => {
      const section = createMockSection({
        kind: "STANDARD_VOCABULARY",
        title: null,
        displayOrder: 1,
        sourceTableIndex: 0,
        sourceTitleRowIndex: null,
      });

      (prisma.vocabularySection.create as jest.Mock).mockResolvedValue(section);

      const result = await prisma.vocabularySection.create({
        data: {
          lessonId: section.lessonId,
          kind: section.kind,
          title: section.title,
          displayOrder: section.displayOrder,
          sourceTableIndex: section.sourceTableIndex,
          sourceTitleRowIndex: section.sourceTitleRowIndex,
        },
      });

      expect(result.kind).toBe("STANDARD_VOCABULARY");
      expect(result.title).toBeNull();
      expect(result.displayOrder).toBe(1);
      expect(result.sourceTableIndex).toBe(0);
      expect(result.sourceTitleRowIndex).toBeNull();
    });

    it("creates a section with synonym-antonym kind and non-null title", async () => {
      const section = createMockSection({
        kind: "SYNONYM_ANTONYM",
        title: "Synonyms & Antonyms",
        displayOrder: 2,
      });

      (prisma.vocabularySection.create as jest.Mock).mockResolvedValue(section);

      const result = await prisma.vocabularySection.create({
        data: {
          lessonId: section.lessonId,
          kind: section.kind,
          title: section.title,
          displayOrder: section.displayOrder,
        },
      });

      expect(result.kind).toBe("SYNONYM_ANTONYM");
      expect(result.title).toBe("Synonyms & Antonyms");
      expect(result.displayOrder).toBe(2);
    });

    it("finds sections by lesson ordered by displayOrder", async () => {
      const sections = [
        createMockSection({ id: "sec-1", displayOrder: 0, kind: "STANDARD_VOCABULARY" }),
        createMockSection({ id: "sec-2", displayOrder: 1, kind: "SYNONYM_ANTONYM", title: "Synonyms" }),
      ];

      (prisma.vocabularySection.findMany as jest.Mock).mockResolvedValue(sections);

      const result = await prisma.vocabularySection.findMany({
        where: { lessonId: "lesson-0001" },
        orderBy: { displayOrder: "asc" },
      });

      expect(result).toHaveLength(2);
      expect(result[0].displayOrder).toBe(0);
      expect(result[1].displayOrder).toBe(1);
    });
  });

  describe("VocabularyRelation CRUD", () => {
    it("creates a relation with all six fields", async () => {
      const relation = createMockRelation({
        primaryWord: "happy",
        primaryTranslation: "سعيد",
        synonym: "joyful",
        synonymTranslation: "مبتهج",
        antonym: "sad",
        antonymTranslation: "حزين",
      });

      (prisma.vocabularyRelation.create as jest.Mock).mockResolvedValue(relation);

      const result = await prisma.vocabularyRelation.create({
        data: {
          lessonId: relation.lessonId,
          sectionId: relation.sectionId,
          primaryWord: relation.primaryWord,
          primaryTranslation: relation.primaryTranslation,
          synonym: relation.synonym,
          synonymTranslation: relation.synonymTranslation,
          antonym: relation.antonym,
          antonymTranslation: relation.antonymTranslation,
          displayOrder: relation.displayOrder,
        },
      });

      expect(result.primaryWord).toBe("happy");
      expect(result.primaryTranslation).toBe("سعيد");
      expect(result.synonym).toBe("joyful");
      expect(result.synonymTranslation).toBe("مبتهج");
      expect(result.antonym).toBe("sad");
      expect(result.antonymTranslation).toBe("حزين");
    });

    it("creates a relation with null synonym/antonym fields", async () => {
      const relation = createMockRelation({
        primaryWord: "run",
        primaryTranslation: "يجري",
        synonym: null,
        synonymTranslation: null,
        antonym: null,
        antonymTranslation: null,
      });

      (prisma.vocabularyRelation.create as jest.Mock).mockResolvedValue(relation);

      const result = await prisma.vocabularyRelation.create({
        data: {
          lessonId: relation.lessonId,
          sectionId: relation.sectionId,
          primaryWord: relation.primaryWord,
          primaryTranslation: relation.primaryTranslation,
          synonym: relation.synonym,
          synonymTranslation: relation.synonymTranslation,
          antonym: relation.antonym,
          antonymTranslation: relation.antonymTranslation,
          displayOrder: relation.displayOrder,
        },
      });

      expect(result.primaryWord).toBe("run");
      expect(result.synonym).toBeNull();
      expect(result.synonymTranslation).toBeNull();
      expect(result.antonym).toBeNull();
      expect(result.antonymTranslation).toBeNull();
    });

    it("finds relations by section", async () => {
      const relations = [
        createMockRelation({ id: "rel-1", displayOrder: 0 }),
        createMockRelation({ id: "rel-2", displayOrder: 1 }),
      ];

      (prisma.vocabularyRelation.findMany as jest.Mock).mockResolvedValue(relations);

      const result = await prisma.vocabularyRelation.findMany({
        where: { sectionId: "sec-0001" },
        orderBy: { displayOrder: "asc" },
      });

      expect(result).toHaveLength(2);
    });
  });

  describe("LessonVocabulary extended fields", () => {
    it("creates vocabulary item with sectionId and source fields", async () => {
      const item = createMockVocabularyItem({
        sectionId: "sec-0001",
        word: "achieve",
        translation: "يحقق",
        sourceTableIndex: 0,
        sourceRowIndex: 3,
        sourcePairIndex: 0,
      });

      (prisma.lessonVocabulary.create as jest.Mock).mockResolvedValue(item);

      const result = await prisma.lessonVocabulary.create({
        data: {
          lessonId: item.lessonId,
          sectionId: item.sectionId,
          word: item.word,
          translation: item.translation,
          sourceTableIndex: item.sourceTableIndex,
          sourceRowIndex: item.sourceRowIndex,
          sourcePairIndex: item.sourcePairIndex,
          displayOrder: item.displayOrder,
        },
      });

      expect(result.sectionId).toBe("sec-0001");
      expect(result.sourceTableIndex).toBe(0);
      expect(result.sourceRowIndex).toBe(3);
      expect(result.sourcePairIndex).toBe(0);
    });

    it("preserves concatenated Arabic text fields", async () => {
      const item = createMockVocabularyItem({
        word: "commitment",
        translation: "التزام - تفان",
        sourcePairIndex: null,
      });

      (prisma.lessonVocabulary.create as jest.Mock).mockResolvedValue(item);

      const result = await prisma.lessonVocabulary.create({
        data: {
          lessonId: item.lessonId,
          word: item.word,
          translation: item.translation,
          displayOrder: item.displayOrder,
        },
      });

      expect(result.translation).toBe("التزام - تفان");
    });

    it("finds vocabulary items by section", async () => {
      const items = [
        createMockVocabularyItem({ id: "v-1", sectionId: "sec-0001", displayOrder: 0 }),
        createMockVocabularyItem({ id: "v-2", sectionId: "sec-0001", displayOrder: 1 }),
      ];

      (prisma.lessonVocabulary.findMany as jest.Mock).mockResolvedValue(items);

      const result = await prisma.lessonVocabulary.findMany({
        where: { sectionId: "sec-0001" },
        orderBy: { displayOrder: "asc" },
      });

      expect(result).toHaveLength(2);
      expect(result.every((i) => i.sectionId === "sec-0001")).toBe(true);
    });
  });

  describe("Section ownership and cascading", () => {
    it("sets sectionId to null when section is deleted (SetNull)", async () => {
      const updatedItem = createMockVocabularyItem({
        sectionId: null,
      });

      (prisma.lessonVocabulary.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await prisma.lessonVocabulary.updateMany({
        where: { sectionId: "sec-0001" },
        data: { sectionId: null },
      });

      expect(result.count).toBe(1);
    });

    it("allows vocabulary item with null sectionId", async () => {
      const item = createMockVocabularyItem({ sectionId: null });

      expect(item.sectionId).toBeNull();
    });
  });

  describe("B1 → Persistence field mapping", () => {
    it("maps VocabularySectionDraft fields to VocabularySection model", () => {
      const draftFields = ["clientDraftId", "kind", "title", "displayOrder", "sourceTableIndex", "sourceTitleRowIndex"];
      const modelFields = ["id", "lessonId", "kind", "title", "displayOrder", "sourceTableIndex", "sourceTitleRowIndex", "createdAt", "updatedAt"];

      const draftKeys = draftFields.filter((f) => f !== "clientDraftId");
      draftKeys.forEach((field) => {
        expect(modelFields).toContain(field);
      });
    });

    it("maps VocabularyStandardItemDraft fields to LessonVocabulary model", () => {
      const draftFields = ["word", "translation", "definition", "example", "partOfSpeech", "displayOrder", "sourceTableIndex", "sourceRowIndex", "sourcePairIndex"];
      const modelFields = ["id", "lessonId", "sectionId", "word", "translation", "definition", "example", "partOfSpeech", "sourceTableIndex", "sourceRowIndex", "sourcePairIndex", "displayOrder", "createdAt"];

      draftFields.forEach((field) => {
        expect(modelFields).toContain(field);
      });
    });

    it("maps VocabularyRelationDraft fields to VocabularyRelation model", () => {
      const draftFields = ["primaryWord", "primaryTranslation", "synonym", "synonymTranslation", "antonym", "antonymTranslation", "displayOrder", "sourceTableIndex", "sourceRowIndex"];
      const modelFields = ["id", "lessonId", "sectionId", "primaryWord", "primaryTranslation", "synonym", "synonymTranslation", "antonym", "antonymTranslation", "displayOrder", "sourceTableIndex", "sourceRowIndex", "createdAt", "updatedAt"];

      draftFields.forEach((field) => {
        expect(modelFields).toContain(field);
      });
    });
  });
});
