import type { QuestionType } from "../enums/question-type.enum";
import type { QuestionHint } from "../interfaces/question-hint.interface";
import type { QuestionAttachment } from "../interfaces/question-attachment.interface";
import type { QuestionMetadata } from "../interfaces/question-metadata.interface";
import type { QuestionValidationResult } from "../interfaces/question-validation-result.interface";
import type { QuestionDataBase } from "../interfaces/question-data.interface";
import { QuestionStatus } from "../enums/question-status.enum";

export abstract class BaseQuestion {
  protected readonly data: QuestionDataBase;

  protected constructor(data: QuestionDataBase) {
    this.data = data;
  }

  abstract getType(): QuestionType;

  getId(): string {
    return this.data.id;
  }

  getPrompt(): string {
    return this.data.prompt;
  }

  getInstruction(): string | null {
    return this.data.instruction;
  }

  getExplanation(): string | null {
    return this.data.explanation;
  }

  getHints(): readonly QuestionHint[] {
    return this.data.hints;
  }

  getAttachments(): readonly QuestionAttachment[] {
    return this.data.attachments;
  }

  getMetadata(): QuestionMetadata | null {
    return this.data.metadata;
  }

  getDisplayOrder(): number {
    return this.data.displayOrder;
  }

  hasValidStatus(): boolean {
    const result = this.validate();
    return result.status === QuestionStatus.VALID || result.status === QuestionStatus.WARNING;
  }

  abstract validate(): QuestionValidationResult;

  abstract toJSON(): Record<string, unknown>;
}
