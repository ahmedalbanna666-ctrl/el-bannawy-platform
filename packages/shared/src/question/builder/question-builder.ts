import type { QuestionData } from "../interfaces/question-data.interface";
import type { BaseQuestion } from "../entities/base-question.entity";
import { QuestionFactory } from "../factories/question-factory";
import { QuestionValidator } from "../validators/question-validator";
import type { QuestionValidationResult } from "../interfaces/question-validation-result.interface";

export interface BuilderInput {
  readonly questions: readonly QuestionData[];
}

export interface BuilderOutput {
  readonly questions: readonly BaseQuestion[];
  readonly validation: readonly QuestionValidationResult[];
  readonly totalCount: number;
  readonly validCount: number;
  readonly warningCount: number;
  readonly invalidCount: number;
}

export class QuestionBuilder {
  private readonly factory: QuestionFactory;
  private readonly validator: QuestionValidator;

  constructor(factory: QuestionFactory, validator: QuestionValidator) {
    this.factory = factory;
    this.validator = validator;
  }

  build(data: QuestionData): BaseQuestion {
    return this.factory.create(data);
  }

  buildAll(input: BuilderInput): BuilderOutput {
    const questions = input.questions.map((q) => this.factory.create(q));
    const validation = this.validator.validateAll(questions);

    const validCount = validation.filter((v) => v.status === "VALID").length;
    const warningCount = validation.filter((v) => v.status === "WARNING").length;
    const invalidCount = validation.filter((v) => v.status === "INVALID").length;

    return {
      questions,
      validation,
      totalCount: questions.length,
      validCount,
      warningCount,
      invalidCount,
    };
  }
}
