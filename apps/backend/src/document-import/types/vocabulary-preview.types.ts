export type VocabularyPreviewStatus = "VALID" | "WARNING" | "INVALID";

export interface VocabularyPreviewItem {
  readonly clientDraftId: string;
  readonly sourceTableIndex: number;
  readonly sourceRowIndex: number;
  readonly sourcePairIndex: 0 | 1;
  readonly displayOrder: number;
  readonly word: string;
  readonly translation: string;
  readonly partOfSpeech: string | null;
  readonly status: VocabularyPreviewStatus;
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
}

export interface VocabularyPreviewCounts {
  readonly total: number;
  readonly valid: number;
  readonly warning: number;
  readonly invalid: number;
}

export interface VocabularyImportPreview {
  readonly parserProfile: "VOCABULARY_TABLE_V1";
  readonly counts: VocabularyPreviewCounts;
  readonly items: readonly VocabularyPreviewItem[];
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
}
