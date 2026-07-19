import { VideoEventState, type VideoEventHandler, type VideoEvent } from "../../event-engine/types";
import type { QuestionData, QuestionOptionData } from "./types";
import { api } from "@/lib/api-client";

export interface QuestionHandlerCallbacks {
  readonly onTrigger: (question: QuestionData) => void;
}

function stripIsCorrect(option: {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
  displayOrder: number;
  metadata: Record<string, unknown>;
}): QuestionOptionData {
  return {
    id: option.id,
    questionId: option.questionId,
    text: option.text,
    displayOrder: option.displayOrder,
    metadata: option.metadata,
  };
}

export function createQuestionHandler(callbacks?: QuestionHandlerCallbacks): VideoEventHandler {
  return {
    eventType: "QUESTION",

    canHandle(type: string): boolean {
      return type.toUpperCase() === "QUESTION";
    },

    async onTrigger(event: VideoEvent): Promise<VideoEventState> {
      try {
        const response = await api.get(`/video-questions/by-video-event/${event.id}`);
        const questionData = (response as { data: unknown }).data as {
          id: string;
          videoEventId: string;
          type: string;
          title: string;
          instructions: string | null;
          displayOrder: number;
          metadata: Record<string, unknown>;
          options: {
            id: string;
            questionId: string;
            text: string;
            isCorrect: boolean;
            displayOrder: number;
            metadata: Record<string, unknown>;
          }[];
        };

        const question: QuestionData = {
          id: questionData.id,
          videoEventId: questionData.videoEventId,
          type: questionData.type as QuestionData["type"],
          title: questionData.title,
          instructions: questionData.instructions,
          displayOrder: questionData.displayOrder,
          metadata: questionData.metadata,
          options: questionData.options.map(stripIsCorrect),
        };

        callbacks?.onTrigger(question);

        return VideoEventState.Triggered;
      } catch {
        return VideoEventState.Error;
      }
    },

    onSkip(_event: VideoEvent): Promise<VideoEventState> {
      return Promise.resolve(VideoEventState.Skipped);
    },
  };
}
