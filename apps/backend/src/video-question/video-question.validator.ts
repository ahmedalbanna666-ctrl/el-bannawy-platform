import { Injectable } from "@nestjs/common";
import type { IVideoQuestion, IVideoQuestionAnswer, IVideoQuestionValidationResult } from "./interfaces";

@Injectable()
export class VideoQuestionValidator {
  validate(question: IVideoQuestion, answer: IVideoQuestionAnswer): IVideoQuestionValidationResult {
    switch (question.type) {
      case "MULTIPLE_CHOICE":
        return this.validateMultipleChoice(question, answer);
      case "TRUE_FALSE":
        return this.validateTrueFalse(question, answer);
      case "MULTIPLE_SELECT":
        return this.validateMultipleSelect(question, answer);
      case "FILL_BLANK":
        return this.validateFillBlank(question, answer);
      case "MATCHING":
        return this.validateMatching(question);
      case "ORDERING":
        return this.validateOrdering(question, answer);
      default:
        return {
          isValid: false,
          correct: false,
          score: 0,
          maxScore: 1,
          errors: [`Unknown question type: ${question.type}`],
        };
    }
  }

  private validateMultipleChoice(question: IVideoQuestion, answer: IVideoQuestionAnswer): IVideoQuestionValidationResult {
    if (answer.selectedOptionIds.length !== 1) {
      return {
        isValid: false,
        correct: false,
        score: 0,
        maxScore: 1,
        errors: ["Multiple choice requires exactly one selection"],
      };
    }
    const selectedId = answer.selectedOptionIds[0];
    const option = question.options.find((o) => o.id === selectedId);
    if (!option) {
      return {
        isValid: false,
        correct: false,
        score: 0,
        maxScore: 1,
        errors: ["Selected option not found"],
      };
    }
    return {
      isValid: true,
      correct: option.isCorrect,
      score: option.isCorrect ? 1 : 0,
      maxScore: 1,
      errors: [],
    };
  }

  private validateTrueFalse(question: IVideoQuestion, answer: IVideoQuestionAnswer): IVideoQuestionValidationResult {
    if (answer.selectedOptionIds.length !== 1) {
      return {
        isValid: false,
        correct: false,
        score: 0,
        maxScore: 1,
        errors: ["True/False requires exactly one selection"],
      };
    }
    const selectedId = answer.selectedOptionIds[0];
    const option = question.options.find((o) => o.id === selectedId);
    if (!option) {
      return {
        isValid: false,
        correct: false,
        score: 0,
        maxScore: 1,
        errors: ["Selected option not found"],
      };
    }
    return {
      isValid: true,
      correct: option.isCorrect,
      score: option.isCorrect ? 1 : 0,
      maxScore: 1,
      errors: [],
    };
  }

  private validateMultipleSelect(question: IVideoQuestion, answer: IVideoQuestionAnswer): IVideoQuestionValidationResult {
    if (answer.selectedOptionIds.length === 0) {
      return {
        isValid: false,
        correct: false,
        score: 0,
        maxScore: question.options.length,
        errors: ["No options selected"],
      };
    }
    const correctIds = new Set(question.options.filter((o) => o.isCorrect).map((o) => o.id));
    const selectedIds = new Set(answer.selectedOptionIds);
    let correctCount = 0;
    const errors: string[] = [];
    for (const selectedId of selectedIds) {
      if (correctIds.has(selectedId)) {
        correctCount++;
      } else {
        errors.push(`Option "${selectedId}" is incorrect`);
      }
    }
    for (const correctId of correctIds) {
      if (!selectedIds.has(correctId)) {
        errors.push(`Correct option "${correctId}" was not selected`);
      }
    }
    const allCorrect = correctCount === correctIds.size && selectedIds.size === correctIds.size;
    return {
      isValid: true,
      correct: allCorrect,
      score: correctCount,
      maxScore: correctIds.size,
      errors,
    };
  }

  private validateFillBlank(question: IVideoQuestion, answer: IVideoQuestionAnswer): IVideoQuestionValidationResult {
    if (!answer.text || answer.text.trim().length === 0) {
      return {
        isValid: false,
        correct: false,
        score: 0,
        maxScore: 1,
        errors: ["Fill-in-the-blank requires text input"],
      };
    }
    const correctOptions = question.options.filter((o) => o.isCorrect);
    const userAnswer = answer.text.trim().toLowerCase();
    const correct = correctOptions.some((opt) => opt.text.toLowerCase() === userAnswer);
    return {
      isValid: true,
      correct,
      score: correct ? 1 : 0,
      maxScore: 1,
      errors: correct ? [] : ["Incorrect answer"],
    };
  }

  private validateMatching(question: IVideoQuestion): IVideoQuestionValidationResult {
    return {
      isValid: false,
      correct: false,
      score: 0,
      maxScore: question.options.length,
      errors: ["Matching validation not yet implemented"],
    };
  }

  private validateOrdering(question: IVideoQuestion, answer: IVideoQuestionAnswer): IVideoQuestionValidationResult {
    const correctOrder = question.options
      .filter((o) => o.isCorrect)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((o) => o.id);
    const matches = answer.selectedOptionIds.every((id, idx) => idx < correctOrder.length && id === correctOrder[idx]);
    return {
      isValid: true,
      correct: matches,
      score: matches ? 1 : 0,
      maxScore: 1,
      errors: matches ? [] : ["Incorrect order"],
    };
  }
}
