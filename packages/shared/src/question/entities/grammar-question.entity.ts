import { QuestionType } from "../enums/question-type.enum";
import { QuestionStatus } from "../enums/question-status.enum";
import type { GrammarQuestionData } from "../interfaces/question-data.interface";
import type { QuestionValidationResult } from "../interfaces/question-validation-result.interface";
import { BaseQuestion } from "./base-question.entity";

export class GrammarQuestion extends BaseQuestion {
  declare protected readonly data: GrammarQuestionData;

  constructor(data: GrammarQuestionData) {
    super(data);
    this.data = data;
  }

  getType(): QuestionType {
    return QuestionType.GRAMMAR;
  }

  getBracketedWord(): string {
    return this.data.bracketedWord;
  }

  getCorrectForm(): string {
    return this.data.correctForm;
  }

  getContextSentence(): string {
    return this.data.contextSentence;
  }

  validate(): QuestionValidationResult {
    const errors: { code: string; message: string; field: string | null }[] = [];
    const warnings: { code: string; message: string; field: string | null }[] = [];

    if (this.data.bracketedWord.trim().length === 0) {
      errors.push({ code: "GRM_001", message: "Grammar question requires a bracketed word", field: "bracketedWord" });
    }

    if (this.data.correctForm.trim().length === 0) {
      errors.push({ code: "GRM_002", message: "Grammar question requires a correct form", field: "correctForm" });
    }

    if (this.data.contextSentence.trim().length === 0) {
      errors.push({ code: "GRM_003", message: "Grammar question requires a context sentence", field: "contextSentence" });
    }

    const status = errors.length > 0 ? QuestionStatus.INVALID : warnings.length > 0 ? QuestionStatus.WARNING : QuestionStatus.VALID;

    return { status, errors, warnings };
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.data.id,
      type: QuestionType.GRAMMAR,
      prompt: this.data.prompt,
      instruction: this.data.instruction,
      explanation: this.data.explanation,
      bracketedWord: this.data.bracketedWord,
      correctForm: this.data.correctForm,
      contextSentence: this.data.contextSentence,
      hints: this.data.hints,
      attachments: this.data.attachments,
      metadata: this.data.metadata,
      displayOrder: this.data.displayOrder,
    };
  }
}
