import type { VocabularyPreviewStatus, VocabularyPreviewCounts } from "./vocabulary-preview.types";

export type VocabularySectionKind = "STANDARD_VOCABULARY" | "SYNONYM_ANTONYM";

export interface VocabularySectionDraft {
  readonly clientDraftId: string;
  readonly kind: VocabularySectionKind;
  readonly title: string | null;
  readonly displayOrder: number;
  readonly sourceTableIndex: number;
  readonly sourceTitleRowIndex: number | null;
}

export interface VocabularyStandardItemDraft {
  readonly kind: "STANDARD_ITEM";
  readonly clientDraftId: string;
  readonly sectionClientDraftId: string;
  readonly word: string;
  readonly translation: string;
  readonly definition: string | null;
  readonly example: string | null;
  readonly partOfSpeech: string | null;
  readonly displayOrder: number;
  readonly sourceTableIndex: number;
  readonly sourceRowIndex: number;
  readonly sourcePairIndex: 0 | 1;
  readonly status: VocabularyPreviewStatus;
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
}

export interface VocabularyRelationDraft {
  readonly kind: "SYNONYM_ANTONYM_RELATION";
  readonly clientDraftId: string;
  readonly sectionClientDraftId: string;
  readonly primaryWord: string;
  readonly primaryTranslation: string;
  readonly synonym: string | null;
  readonly synonymTranslation: string | null;
  readonly antonym: string | null;
  readonly antonymTranslation: string | null;
  readonly displayOrder: number;
  readonly sourceTableIndex: number;
  readonly sourceRowIndex: number;
  readonly status: VocabularyPreviewStatus;
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
}

export type VocabularyItemDraft = VocabularyStandardItemDraft | VocabularyRelationDraft;

export interface VocabularyStructuredDraft {
  readonly parserProfile: "VOCABULARY_STRUCTURED_V2";
  readonly sections: readonly VocabularySectionDraft[];
  readonly items: readonly VocabularyItemDraft[];
  readonly counts: VocabularyPreviewCounts;
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
}
