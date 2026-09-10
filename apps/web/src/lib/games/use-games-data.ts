import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { parseDisplayWord } from "@/lib/word-display";
import type { GameUnitOption, GameWord } from "./types";

interface CurriculumLesson {
  id: string;
  title: string;
}

interface CurriculumUnit {
  id: string;
  title: string;
  isPremium: boolean;
  unlocked: boolean;
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
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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
              unlocked: (unit as unknown as { unlocked?: boolean }).unlocked ?? true,
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
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async (): Promise<GameWord[]> => {
      const results = await Promise.all(
        lessonIds.map(async (lessonId) => {
          try {
            const res = await api.get<VocabularyApiItem[]>(
              `/lessons/${lessonId}/vocabulary`,
            );
            return res.data ?? [];
          } catch {
            // Skip lessons the student cannot access instead of failing the whole pool.
            return [];
          }
        }),
      );

      const collected: GameWord[] = [];
      for (const items of results) {
        for (const item of items) {
          if (item.word && item.translation) {
            const { displayWord } = parseDisplayWord(item.word);
            collected.push({ word: displayWord, translation: item.translation });
          }
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
