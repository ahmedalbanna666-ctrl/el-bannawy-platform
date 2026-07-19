import { QuestionType } from "../enums/question-type.enum";
import { QuestionStatus } from "../enums/question-status.enum";
import type { TrueFalseQuestionData } from "../interfaces/question-data.interface";
import type { QuestionOption } from "../interfaces/question-option.interface";
import type { QuestionValidationResult } from "../interfaces/question-validation-result.interface";
import { BaseQuestion } from "./base-question.entity";

export class TrueFalseQuestion extends BaseQuestion {
  declare protected readonly data: TrueFalseQuestionData;

  constructor(data: TrueFalseQuestionData) {
    super(data);
    this.data = data;
  }

  getType(): QuestionType {
    return QuestionType.TRUE_FALSE;
  }

  getOptions(): readonly QuestionOption[] {
    return this.data.options;
  }

  getCorrectOptionIndex(): number {
    return this.data.options.findIndex((opt) => opt.isCorrect);
  }

  validate(): QuestionValidationResult {
    const errors: { code: string; message: string; field: string | null }[] = [];
    const warnings: { code: string; message: string; field: string | null }[] = [];

    if (this.data.options.length === 0) {
      errors.push({ code: "TF_001", message: "True/False question requires options", field: "options" });
    }

    const correctCount = this.data.options.filter((opt) => opt.isCorrect).length;
    if (correctCount === 0) {
      errors.push({ code: "TF_002", message: "True/False question must have a correct option", field: "options" });
    }
    if (correctCount > 1) {
      errors.push({ code: "TF_003", message: "True/False question must have exactly one correct option", field: "options" });
    }

    const status = errors.length > 0 ? QuestionStatus.INVALID : warnings.length > 0 ? QuestionStatus.WARNING : QuestionStatus.VALID;

    return { status, errors, warnings };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.data.id,
      type: QuestionType.TRUE_FALSE,
      prompt: this.data.prompt,
      instruction: this.data.instruction,
      explanation: this.data.explanation,
      options: this.data.options,
      hints: this.data.hints,
      attachments: this.data.attachments,
      metadata: this.data.metadata,
      displayOrder: this.data.displayOrder,
    };
  }
}
