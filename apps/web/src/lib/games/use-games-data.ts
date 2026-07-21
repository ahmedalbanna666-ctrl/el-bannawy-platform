import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { GameUnitOption, GameWord } from "./types";

interface CurriculumLesson {
  id: string;
  title: string;
}

interface CurriculumUnit {
  id: string;
  title: string;
  isPremium: boolean;
  lessons: CurriculumLesson[];
}

interface CurriculumGrade {
  id: string;
  name: string;
  units: CurriculumUnit[];
}

interface CurriculumStage {
  id: string;
  name: string;
  grades: CurriculumGrade[];
}

export function useCurriculumUnits(): UseQueryResult<GameUnitOption[]> {
  return useQuery({
    queryKey: ["games", "curriculum-units"],
    queryFn: async (): Promise<GameUnitOption[]> => {
      const res = await api.get<CurriculumStage[]>("/curriculum");
      const stages = res.data ?? [];
      const units: GameUnitOption[] = [];

      for (const stage of stages) {
        for (const grade of stage.grades) {
          for (const unit of grade.units) {
            units.push({
              id: unit.id,
              title: unit.title,
              gradeName: grade.name,
              isPremium: unit.isPremium,
              lessonIds: unit.lessons.map((lesson) => lesson.id),
            });
          }
        }
      }

      return units;
    },
  });
}

interface VocabularyApiItem {
  word: string;
  translation: string;
}

export function useUnitVocabulary(
  unitId: string,
  lessonIds: string[],
): UseQueryResult<GameWord[]> {
  return useQuery({
    queryKey: ["games", "unit-vocabulary", unitId],
    enabled: lessonIds.length > 0,
    queryFn: async (): Promise<GameWord[]> => {
      const collected: GameWord[] = [];

      for (const lessonId of lessonIds) {
        try {
          const res = await api.get<VocabularyApiItem[]>(
            `/lessons/${lessonId}/vocabulary`,
          );
          for (const item of res.data ?? []) {
            if (item.word && item.translation) {
              collected.push({ word: item.word, translation: item.translation });
            }
          }
        } catch {
          // Skip lessons the student cannot access instead of failing the whole pool.
          continue;
        }
      }

      const unique = new Map<string, GameWord>();
      for (const entry of collected) {
        if (!unique.has(entry.word)) {
          unique.set(entry.word, entry);
        }
      }

      return Array.from(unique.values());
    },
  });
}
