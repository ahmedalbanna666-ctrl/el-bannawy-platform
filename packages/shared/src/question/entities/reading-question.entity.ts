import { QuestionType } from "../enums/question-type.enum";
import { QuestionStatus } from "../enums/question-status.enum";
import type { ReadingQuestionData, QuestionData } from "../interfaces/question-data.interface";
import type { QuestionValidationResult } from "../interfaces/question-validation-result.interface";
import { BaseQuestion } from "./base-question.entity";

export class ReadingQuestion extends BaseQuestion {
  declare protected readonly data: ReadingQuestionData;

  constructor(data: ReadingQuestionData) {
    super(data);
    this.data = data;
  }

  getType(): QuestionType {
    return QuestionType.READING;
  }

  getPassageText(): string {
    return this.data.passageText;
  }

  getPassageTitle(): string | null {
    return this.data.passageTitle;
  }

  getSubQuestions(): readonly QuestionData[] {
    return this.data.subQuestions;
  }

  validate(): QuestionValidationResult {
    const errors: { code: string; message: string; field: string | null }[] = [];
    const warnings: { code: string; message: string; field: string | null }[] = [];

    if (this.data.passageText.trim().length === 0) {
      errors.push({ code: "RD_001", message: "Reading question requires a passage text", field: "passageText" });
    }

    if (this.data.subQuestions.length === 0) {
      errors.push({ code: "RD_002", message: "Reading question requires at least one sub-question", field: "subQuestions" });
    }

    const status = errors.length > 0 ? QuestionStatus.INVALID : warnings.length > 0 ? QuestionStatus.WARNING : QuestionStatus.VALID;

    return { status, errors, warnings };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.data.id,
      type: QuestionType.READING,
      prompt: this.data.prompt,
      instruction: this.data.instruction,
      explanation: this.data.explanation,
      passageText: this.data.passageText,
      passageTitle: this.data.passageTitle,
      subQuestions: this.data.subQuestions,
      hints: this.data.hints,
      attachments: this.data.attachments,
      metadata: this.data.metadata,
      displayOrder: this.data.displayOrder,
    };
  }
}
