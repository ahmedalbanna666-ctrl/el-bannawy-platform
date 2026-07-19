import { QuestionType } from "../enums/question-type.enum";
import { QuestionStatus } from "../enums/question-status.enum";
import type { ReadingSubQuestionData } from "../interfaces/question-data.interface";
import type { QuestionOption } from "../interfaces/question-option.interface";
import type { QuestionValidationResult } from "../interfaces/question-validation-result.interface";
import { BaseQuestion } from "./base-question.entity";

export class ReadingSubQuestion extends BaseQuestion {
  declare protected readonly data: ReadingSubQuestionData;

  constructor(data: ReadingSubQuestionData) {
    super(data);
    this.data = data;
  }

  getType(): QuestionType {
    return QuestionType.READING_QUESTION;
  }

  getPassageReferenceId(): string {
    return this.data.passageReferenceId;
  }

  getOptions(): readonly QuestionOption[] | null {
    return this.data.options;
  }

  getCorrectAnswer(): string | null {
    return this.data.correctAnswer;
  }

  validate(): QuestionValidationResult {
    const errors: { code: string; message: string; field: string | null }[] = [];
    const warnings: { code: string; message: string; field: string | null }[] = [];

    if (this.data.prompt.trim().length === 0) {
      errors.push({ code: "RDQ_001", message: "Reading sub-question requires a question prompt", field: "prompt" });
    }

    if (this.data.options !== null && this.data.options.length > 0) {
      const correctCount = this.data.options.filter((opt) => opt.isCorrect).length;
      if (correctCount === 0) {
        warnings.push({ code: "RDQ_002", message: "Reading sub-question with options has no correct option marked", field: "options" });
      }
    }

    const status = errors.length > 0 ? QuestionStatus.INVALID : warnings.length > 0 ? QuestionStatus.WARNING : QuestionStatus.VALID;

    return { status, errors, warnings };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.data.id,
      type: QuestionType.READING_QUESTION,
      prompt: this.data.prompt,
      instruction: this.data.instruction,
      explanation: this.data.explanation,
      passageReferenceId: this.data.passageReferenceId,
      options: this.data.options,
      correctAnswer: this.data.correctAnswer,
      hints: this.data.hints,
      attachments: this.data.attachments,
      metadata: this.data.metadata,
      displayOrder: this.data.displayOrder,
    };
  }
}
