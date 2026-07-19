import { api } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";

export interface GradeSupportContact {
  id: string;
  name: string;
  supportPhone: string | null;
  supportEmail: string | null;
  supportWhatsapp: string | null;
}

export interface UpdateGradeSupportContactDto {
  supportPhone?: string | null;
  supportEmail?: string | null;
  supportWhatsapp?: string | null;
}

export function useGradeSupportContacts(gradeId?: string): UseQueryResult<GradeSupportContact[]> {
  const params = gradeId ? `?gradeId=${gradeId}` : "";
  return useQuery<GradeSupportContact[]>({
    queryKey: ["grade-support-contacts", gradeId],
    queryFn: async () => {
      const res = await api.get<GradeSupportContact[]>(`/grade-support/contacts${params}`);
      return res.data ?? [];
    },
  });
}

export function useUpdateGradeSupportContact(): UseMutationResult<
  GradeSupportContact,
  Error,
  { gradeId: string; data: UpdateGradeSupportContactDto }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ gradeId, data }) => {
      const res = await api.patch<GradeSupportContact>(`/grade-support/contacts/${gradeId}`, data);
      if (!res.data) throw new Error("No data returned");
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["grade-support-contacts"] });
    },
  });
}
