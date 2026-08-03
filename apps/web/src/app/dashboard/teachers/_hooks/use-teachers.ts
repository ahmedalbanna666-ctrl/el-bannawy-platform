import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface AssignedGrade {
  id: string;
  name: string;
  stage: { id: string; name: string } | null;
  _count?: { users: number; units: number };
}

export interface Teacher {
  id: string;
  fullName: string;
  englishName: string | null;
  email: string | null;
  mobileNumber: string | null;
  role: string;
  status: string;
  governorate: string | null;
  school: string | null;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
  assignedGrades: AssignedGrade[];
}

export interface TeacherDetail extends Teacher {
  deletedAt: string | null;
}

export interface ListResponse {
  teachers: Teacher[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface StageItem {
  id: string;
  name: string;
  grades: { id: string; name: string; displayOrder: number; _count?: { users: number } }[];
}

export const LIST_STATUS_OPTIONS = [
  { value: "", label: "الكل" },
  { value: "ACTIVE", label: "نشط" },
  { value: "SUSPENDED", label: "موقوف" },
  { value: "BANNED", label: "محظور" },
  { value: "DELETED", label: "محذوف" },
];

export function useTeachers(params: Record<string, string>): UseQueryResult<ListResponse> {
  const searchParams = new URLSearchParams(params);
  return useQuery<ListResponse>({
    queryKey: ["teachers", params],
    queryFn: async () => {
      const res = await api.get<ListResponse>(`/admin/teachers?${searchParams.toString()}`);
      return res.data ?? { teachers: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    },
    staleTime: 15_000,
  });
}

export function useTeacherDetail(id: string | null): UseQueryResult<TeacherDetail> {
  return useQuery<TeacherDetail>({
    queryKey: ["teacher", id],
    queryFn: async () => {
      const res = await api.get<TeacherDetail>(`/admin/teachers/${id ?? ""}`);
      if (!res.data) throw new Error("Teacher not found");
      return res.data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useStages(): UseQueryResult<StageItem[]> {
  return useQuery<StageItem[]>({
    queryKey: ["stages"],
    queryFn: async () => {
      const res = await api.get<StageItem[]>("/admin/stages");
      return res.data ?? [];
    },
    staleTime: 300_000,
  });
}
