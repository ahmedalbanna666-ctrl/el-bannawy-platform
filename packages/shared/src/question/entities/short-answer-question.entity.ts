import { QuestionType } from "../enums/question-type.enum";
import { QuestionStatus } from "../enums/question-status.enum";
import type { ShortAnswerQuestionData } from "../interfaces/question-data.interface";
import type { QuestionValidationResult } from "../interfaces/question-validation-result.interface";
import { BaseQuestion } from "./base-question.entity";

export class ShortAnswerQuestion extends BaseQuestion {
  declare protected readonly data: ShortAnswerQuestionData;

  constructor(data: ShortAnswerQuestionData) {
    super(data);
    this.data = data;
  }

  getType(): QuestionType {
    return QuestionType.SHORT_ANSWER;
  }

  getCorrectAnswer(): string {
    return this.data.correctAnswer;
  }

  getAcceptableAnswers(): readonly string[] {
    return this.data.acceptableAnswers;
  }

  getMaxLength(): number | null {
    return this.data.maxLength;
  }

  validate(): QuestionValidationResult {
    const errors: { code: string; message: string; field: string | null }[] = [];
    const warnings: { code: string; message: string; field: string | null }[] = [];

    if (this.data.correctAnswer.trim().length === 0) {
      errors.push({ code: "SA_001", message: "Short answer requires a correct answer", field: "correctAnswer" });
    }

    const status = errors.length > 0 ? QuestionStatus.INVALID : warnings.length > 0 ? QuestionStatus.WARNING : QuestionStatus.VALID;

    return { status, errors, warnings };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.data.id,
      type: QuestionType.SHORT_ANSWER,
      prompt: this.data.prompt,
      instruction: this.data.instruction,
      explanation: this.data.explanation,
      correctAnswer: this.data.correctAnswer,
      acceptableAnswers: this.data.acceptableAnswers,
      maxLength: this.data.maxLength,
      hints: this.data.hints,
      attachments: this.data.attachments,
      metadata: this.data.metadata,
      displayOrder: this.data.displayOrder,
    };
  }
}
