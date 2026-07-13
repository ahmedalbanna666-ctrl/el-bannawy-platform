export type StructuredVocabularyPersistenceMode = "REPLACE_STRUCTURED";

export interface StructuredVocabularyPersistenceOptions {
  readonly mode: StructuredVocabularyPersistenceMode;
}

export interface PersistedSectionResult {
  readonly id: string;
  readonly kind: string;
  readonly title: string | null;
  readonly displayOrder: number;
  readonly sourceTableIndex: number | null;
  readonly sourceTitleRowIndex: number | null;
}

export interface StructuredVocabularyPersistenceResult {
  readonly lessonId: string;
  readonly sectionCount: number;
  readonly standardItemCount: number;
  readonly relationCount: number;
  readonly sections: readonly PersistedSectionResult[];
}

export interface PersistenceValidationError {
  readonly code: string;
  readonly message: string;
  readonly itemIndex?: number;
  readonly sectionClientDraftId?: string;
  readonly itemClientDraftId?: string;
}

export class PersistenceValidationException extends Error {
  public readonly errors: readonly PersistenceValidationError[];

  constructor(errors: readonly PersistenceValidationError[]) {
    super("Vocabulary persistence validation failed: " + String(errors.length) + " error(s)");
    this.name = "PersistenceValidationException";
    this.errors = errors;
  }
}
