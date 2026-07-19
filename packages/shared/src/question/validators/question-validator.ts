import type { BaseQuestion } from "../entities/base-question.entity";
import type {
  QuestionValidationResult,
  QuestionValidationError,
  QuestionValidationWarning,
} from "../interfaces/question-validation-result.interface";
import { QuestionStatus } from "../enums/question-status.enum";

export type QuestionValidatorFunction = (question: BaseQuestion) => QuestionValidationResult;

export class QuestionValidator {
  private readonly registry: Map<string, QuestionValidatorFunction>;

  constructor() {
    this.registry = new Map();
  }

  register(type: string, validator: QuestionValidatorFunction): void {
    this.registry.set(type, validator);
  }

  validate(question: BaseQuestion): QuestionValidationResult {
    const typeValidator = this.registry.get(question.getType());
    if (typeValidator !== undefined) {
      return typeValidator(question);
    }
    return question.validate();
  }

  validateAll(questions: readonly BaseQuestion[]): QuestionValidationResult[] {
    return questions.map((q) => this.validate(q));
  }

  getOverallStatus(results: readonly QuestionValidationResult[]): QuestionStatus {
    const hasInvalid = results.some((r) => r.status === QuestionStatus.INVALID);
    if (hasInvalid) {
      return QuestionStatus.INVALID;
    }
    const hasWarning = results.some((r) => r.status === QuestionStatus.WARNING);
    if (hasWarning) {
      return QuestionStatus.WARNING;
    }
    return QuestionStatus.VALID;
  }

  collectErrors(results: readonly QuestionValidationResult[]): readonly QuestionValidationError[] {
    return results.flatMap((r) => r.errors);
  }

  collectWarnings(results: readonly QuestionValidationResult[]): readonly QuestionValidationWarning[] {
    return results.flatMap((r) => r.warnings);
  }
}
