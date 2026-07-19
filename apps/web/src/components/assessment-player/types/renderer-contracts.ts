import type React from "react";
import type { PlayerQuestion, AnswerRecord } from "./player-types";

export interface QuestionRendererProps {
  question: PlayerQuestion;
  answer: AnswerRecord | undefined;
  onAnswer: (answer: unknown) => void;
  disabled: boolean;
  readonly: boolean;
}

export type QuestionRendererComponent = React.ComponentType<QuestionRendererProps>;

export interface RendererRegistration {
  type: string;
  component: QuestionRendererComponent;
  priority: number;
}

export interface QuestionRendererRegistryEntry {
  type: string;
  component: QuestionRendererComponent;
  priority: number;
  registeredAt: number;
}

export interface RendererContract {
  readonly type: string;
  readonly component: QuestionRendererComponent;
  validateConfig(config: Record<string, unknown>): boolean;
  getDefaultConfig(): Record<string, unknown>;
}
