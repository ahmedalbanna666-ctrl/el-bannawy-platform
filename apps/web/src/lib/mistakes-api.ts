import { api } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";

export type MistakeSource = "ASSESSMENT" | "QUIZ" | "HOMEWORK" | "STORY";

export interface MistakeOption {
  text: string;
  isCorrect: boolean;
}

export interface WrongAnswerItem {
  questionId: string;
  source: MistakeSource;
  question: string;
  options: MistakeOption[];
  correctAnswer: string;
  explanation: string | null;
  answeredAt: string;
  attemptId: string;
  unitId: string | null;
  lessonId: string | null;
  storyId: string | null;
  chapterId: string | null;
  unitTitle: string | null;
  lessonTitle: string | null;
  storyTitle: string | null;
  chapterTitle: string | null;
  termId: string | null;
}

export interface MistakeFilters {
  units: { id: string; title: string }[];
  lessons: { id: string; title: string }[];
  stories: { id: string; title: string }[];
  chapters: { id: string; title: string }[];
  sources: MistakeSource[];
}

export interface MiniExamQuestion {
  questionId: string;
  source: string;
  question: string;
  options: { text: string; isCorrect: boolean }[];
  explanation: string | null;
}

export interface MiniExamSummary {
  id: string;
  questionCount: number;
  durationMinutes: number;
  poolSize: number;
  status: string;
  score: number | null;
  maxScore: number | null;
  passed: boolean | null;
  createdAt: string;
  submittedAt: string | null;
  questions: MiniExamQuestion[];
}

export interface MistakeQueryParams {
  scope?: "all" | "today" | "term";
  unitId?: string;
  lessonId?: string;
  storyId?: string;
  chapterId?: string;
  source?: MistakeSource;
  search?: string;
  studentId?: string;
  page?: number;
  limit?: number;
}

export interface CreateMiniExamDto {
  questionCount: number;
  durationMinutes: number;
  unitId?: string;
  lessonId?: string;
  storyId?: string;
  chapterId?: string;
  source?: MistakeSource;
  search?: string;
  studentId?: string;
}

export interface SubmitMiniExamAnswerDto {
  questionId: string;
  answer?: string | null;
}

export interface SubmitMiniExamDto {
  answers: SubmitMiniExamAnswerDto[];
  timeExpired?: boolean;
}

export const MISTAKES_KEYS = {
  all: ["mistakes"] as const,
  list: (params: MistakeQueryParams) => ["mistakes", "list", params] as const,
  filters: (studentId?: string) => ["mistakes", "filters", studentId] as const,
  miniExam: (id?: string) => ["mistakes", "mini-exam", id] as const,
  miniExamHistory: (studentId?: string) => ["mistakes", "mini-exam", "history", studentId] as const,
};

export function useMistakes(params: MistakeQueryParams): UseQueryResult<{ items: WrongAnswerItem[]; total: number; page: number; limit: number }> {
  const qp = new URLSearchParams();
  if (params.scope) qp.set("scope", params.scope);
  if (params.unitId) qp.set("unitId", params.unitId);
  if (params.lessonId) qp.set("lessonId", params.lessonId);
  if (params.storyId) qp.set("storyId", params.storyId);
  if (params.chapterId) qp.set("chapterId", params.chapterId);
  if (params.source) qp.set("source", params.source);
  if (params.search) qp.set("search", params.search);
  if (params.studentId) qp.set("studentId", params.studentId);
  if (params.page) qp.set("page", String(params.page));
  if (params.limit) qp.set("limit", String(params.limit));
  const qs = qp.toString();

  return useQuery({
    queryKey: MISTAKES_KEYS.list(params),
    queryFn: async () => {
      const res = await api.get<{ items: WrongAnswerItem[]; total: number; page: number; limit: number }>(`/mistakes${qs ? `?${qs}` : ""}`);
      return { items: res.data?.items ?? [], total: res.data?.total ?? 0, page: res.data?.page ?? 1, limit: res.data?.limit ?? 20 };
    },
    staleTime: 15_000,
  });
}

export function useMistakeFilters(studentId?: string): UseQueryResult<MistakeFilters> {
  const qs = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
  return useQuery({
    queryKey: MISTAKES_KEYS.filters(studentId),
    queryFn: async () => {
      const res = await api.get<MistakeFilters>(`/mistakes/filters${qs}`);
      if (!res.data) throw new Error("Failed to load mistake filters");
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useCreateMiniExam(): UseMutationResult<MiniExamSummary, Error, CreateMiniExamDto> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto) => {
      const res = await api.post<MiniExamSummary>("/mistakes/mini-exam", dto);
      if (!res.data) throw new Error("Failed to create mini exam");
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: MISTAKES_KEYS.miniExamHistory() });
    },
  });
}

export function useGetMiniExam(examId?: string): UseQueryResult<MiniExamSummary> {
  return useQuery({
    queryKey: MISTAKES_KEYS.miniExam(examId),
    queryFn: async () => {
      const res = await api.get<MiniExamSummary>(`/mistakes/mini-exam/${examId ?? ""}`);
      if (!res.data) throw new Error("Failed to load mini exam");
      return res.data;
    },
    enabled: Boolean(examId),
    staleTime: 30_000,
  });
}

export function useSubmitMiniExam(): UseMutationResult<MiniExamSummary, Error, { examId: string; dto: SubmitMiniExamDto }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ examId, dto }) => {
      const res = await api.post<MiniExamSummary>(`/mistakes/mini-exam/${examId}/submit`, dto);
      if (!res.data) throw new Error("Failed to submit mini exam");
      return res.data;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: MISTAKES_KEYS.miniExam(data.id) });
      void qc.invalidateQueries({ queryKey: MISTAKES_KEYS.miniExamHistory() });
    },
  });
}

export function useMiniExamHistory(studentId?: string): UseQueryResult<MiniExamSummary[]> {
  const qs = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
  return useQuery({
    queryKey: MISTAKES_KEYS.miniExamHistory(studentId),
    queryFn: async () => {
      const res = await api.get<MiniExamSummary[]>(`/mistakes/mini-exam/history${qs}`);
      return res.data ?? [];
    },
    staleTime: 30_000,
  });
}
