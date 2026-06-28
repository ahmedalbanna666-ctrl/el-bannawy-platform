import { type ReactNode, useState } from "react";
import { MultipleChoiceActivity } from "./multiple-choice";
import { FillInBlankActivity } from "./fill-in-blank";
import { TrueFalseActivity } from "./true-false";
import { MatchingActivity } from "./matching";
import { DragDropActivity } from "./drag-drop";
import { VocabularyActivity } from "./vocabulary";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HelpCircle } from "lucide-react";

export type ActivityType =
  | "MULTIPLE_CHOICE"
  | "FILL_IN_BLANK"
  | "FILL_IN_BLANKS"
  | "TRUE_FALSE"
  | "MATCHING"
  | "DRAG_DROP"
  | "VOCABULARY"
  | "READING"
  | "STORY_QUESTIONS"
  | "CONVERSATION"
  | "SPEAKING"
  | "WRITING"
  | "PARAGRAPH";

export interface ActivityConfig {
  question?: string;
  options?: string[];
  correctAnswer?: string | number;
  answer?: string;
  statements?: { text: string; isTrue: boolean }[];
}

export interface ActivityRendererProps {
  id: string;
  type: ActivityType;
  title: string;
  config: string;
  displayOrder: number;
  onSubmit: (activityId: string, answers: string[], response?: string) => Promise<void>;
}

const COMING_SOON_TYPES: ActivityType[] = [
  "READING",
  "STORY_QUESTIONS",
  "CONVERSATION",
  "SPEAKING",
  "WRITING",
  "PARAGRAPH",
];

export function ActivityRenderer({
  id,
  type,
  title,
  config,
  displayOrder,
  onSubmit,
}: ActivityRendererProps): ReactNode {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  let configParsed: ActivityConfig = {};
  try {
    configParsed = JSON.parse(config) as ActivityConfig;
  } catch {
    configParsed = { question: "Unable to load activity configuration" };
  }

  const handleSubmit = async (answers: string[], response?: string): Promise<void> => {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(id, answers, response);
      setSubmitted(true);
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderActivity = (): ReactNode => {
    switch (type) {
      case "MULTIPLE_CHOICE":
        return (
          <MultipleChoiceActivity
            config={configParsed}
            onSubmit={handleSubmit}
            submitted={submitted}
            submitting={submitting}
          />
        );
      case "FILL_IN_BLANK":
      case "FILL_IN_BLANKS":
        return (
          <FillInBlankActivity
            config={configParsed}
            onSubmit={handleSubmit}
            submitted={submitted}
            submitting={submitting}
          />
        );
      case "TRUE_FALSE":
        return (
          <TrueFalseActivity
            config={configParsed}
            onSubmit={handleSubmit}
            submitted={submitted}
            submitting={submitting}
          />
        );
      case "MATCHING":
        return (
          <MatchingActivity
            config={configParsed}
            onSubmit={handleSubmit}
            submitted={submitted}
            submitting={submitting}
          />
        );
      case "DRAG_DROP":
        return (
          <DragDropActivity
            config={configParsed}
            onSubmit={handleSubmit}
            submitted={submitted}
            submitting={submitting}
          />
        );
      case "VOCABULARY":
        return (
          <VocabularyActivity
            config={configParsed}
            onSubmit={handleSubmit}
            submitted={submitted}
            submitting={submitting}
          />
        );
      default:
        if ((COMING_SOON_TYPES as string[]).includes(type)) {
          return (
            <div className="rounded-lg border border-neutral-200 p-6 text-center dark:border-neutral-700">
              <p className="text-sm text-neutral-500">
                {type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} activity is coming soon
              </p>
            </div>
          );
        }
        return (
          <div className="rounded-lg border border-neutral-200 p-6 text-center dark:border-neutral-700">
            <p className="text-sm text-neutral-500">Activity type &quot;{type}&quot; is coming soon</p>
          </div>
        );
    }
  };

  if (submitted) {
    return (
      <Card variant="outline" padding="sm">
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg bg-success-500/10 p-4">
            <Badge variant="success">Completed</Badge>
            <p className="text-sm font-medium text-success-700 dark:text-success-300">{title}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outline" padding="sm" className="border-primary-500/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary-500" />
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
          <Badge variant="primary">{type}</Badge>
          <span className="ms-auto text-xs text-neutral-400">Activity #{displayOrder}</span>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg bg-danger-500/10 p-3 text-sm text-danger-600 dark:text-danger-400">
            {error}
          </div>
        )}
        {renderActivity()}
      </CardContent>
    </Card>
  );
}
