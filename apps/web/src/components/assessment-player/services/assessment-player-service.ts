import { api } from "@/lib/api-client";
import type {
  LoadAttemptData,
  SubmitResultData,
  SaveAnswerData,
  AnswerRecord,
  PlayerQuestion,
  PlayerSection,
  PlayerConfig,
} from "../types/player-types";

export interface LoadAttemptResponse {
  attemptId: string;
  assessmentId: string;
  status: string;
  questions: PlayerQuestion[];
  sections: PlayerSection[];
  answers: AnswerRecord[];
  config: PlayerConfig;
  remainingTimeSeconds: number | null;
  startedAt: string;
}

export interface SubmitAttemptResponse {
  attemptId: string;
  score: number | null;
  maxScore: number | null;
  passed: boolean | null;
  status: string;
}

export interface SaveAnswerResponse {
  id: string;
  questionId: string;
  answer: unknown;
  savedAt: string;
}

export class AssessmentPlayerService {
  async loadAttempt(attemptId: string): Promise<LoadAttemptData> {
    const response = await api.get<LoadAttemptResponse>(`/assessment-attempts/${attemptId}`);

    if (!response.data) {
      throw new Error("Failed to load attempt: No data returned");
    }

    return {
      attemptId: response.data.attemptId,
      assessmentId: response.data.assessmentId,
      status: response.data.status,
      questions: response.data.questions.map((q) => ({
        ...q,
        config: q.config ?? {},
      })),
      sections: response.data.sections,
      answers: response.data.answers,
      config: response.data.config,
      remainingTimeSeconds: response.data.remainingTimeSeconds,
      startedAt: response.data.startedAt,
    };
  }

  async saveAnswer(
    attemptId: string,
    questionId: string,
    answer: unknown,
  ): Promise<SaveAnswerData> {
    const response = await api.post<SaveAnswerResponse>(
      `/assessment-attempts/${attemptId}/answers`,
      { questionId, answer },
    );

    if (!response.data) {
      throw new Error("Failed to save answer: No data returned");
    }

    return {
      questionId: response.data.questionId,
      answer: response.data.answer,
      savedAt: response.data.savedAt,
    };
  }

  async updateAnswer(
    attemptId: string,
    answerId: string,
    answer: unknown,
  ): Promise<SaveAnswerData> {
    const response = await api.patch<SaveAnswerResponse>(
      `/assessment-attempts/${attemptId}/answers/${answerId}`,
      { answer },
    );

    if (!response.data) {
      throw new Error("Failed to update answer: No data returned");
    }

    return {
      questionId: response.data.questionId,
      answer: response.data.answer,
      savedAt: response.data.savedAt,
    };
  }

  async submitAttempt(attemptId: string): Promise<SubmitResultData> {
    const response = await api.post<SubmitAttemptResponse>(
      `/assessment-attempts/${attemptId}/submit`,
    );

    if (!response.data) {
      throw new Error("Failed to submit attempt: No data returned");
    }

    return {
      attemptId: response.data.attemptId,
      score: response.data.score,
      maxScore: response.data.maxScore,
      passed: response.data.passed,
      status: response.data.status,
    };
  }

  async getAttemptAnswers(attemptId: string): Promise<readonly AnswerRecord[]> {
    const response = await api.get<readonly AnswerRecord[]>(
      `/assessment-attempts/${attemptId}/answers`,
    );

    return response.data ?? [];
  }
}
