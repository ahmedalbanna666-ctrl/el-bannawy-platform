import { api, type ApiResponse } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";

export interface ReferralOverview {
  code: string;
  link: string;
  stats: {
    totalInvitations: number;
    pending: number;
    approved: number;
    rejected: number;
    coinsEarned: number;
  };
  history: ReferralHistoryItem[];
}

export interface ReferralHistoryItem {
  id: string;
  referrerId: string;
  referredId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  purchasedType: string | null;
  purchasedAmount: number | null;
  rewardCoins: number;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  referred?: { id: string; fullName: string; mobileNumber: string | null };
}

export interface ReferralPopup {
  campaign: {
    id: string;
    title: string;
    message: string;
    unitRewardPercent: number;
    termRewardPercent: number;
  } | null;
  code: string | null;
  link: string | null;
  shouldShow: boolean;
}

export interface ReferralCampaignItem {
  id: string;
  title: string;
  message: string;
  active: boolean;
  targetStageId: string | null;
  targetGradeId: string | null;
  maxViewsPerDay: number;
  showDaysPerWeek: string;
  unitRewardPercent: number;
  termRewardPercent: number;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { views: number; referrals: number };
  createdBy?: { id: string; fullName: string };
}

export interface AdminReferralItem {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  purchasedType: string | null;
  purchasedAmount: number | null;
  rewardCoins: number;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  referrer: { id: string; fullName: string; mobileNumber: string | null };
  referred: { id: string; fullName: string; mobileNumber: string | null };
  campaign: { id: string; title: string } | null;
}

export interface ReferralPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ReferralStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  coinsEarned: number;
  conversionRate: number;
}

export const REFERRAL_KEYS = {
  all: ["referrals"] as const,
  overview: ["referrals", "overview"] as const,
  popup: ["referrals", "popup"] as const,
  campaigns: ["referrals", "campaigns"] as const,
  list: ["referrals", "list"] as const,
  stats: ["referrals", "stats"] as const,
};

export function useReferralOverview(): UseQueryResult<ReferralOverview> {
  return useQuery({
    queryKey: REFERRAL_KEYS.overview,
    queryFn: async () => {
      const res = await api.get<ReferralOverview>("/referrals/overview");
      if (!res.data) throw new Error("Failed to fetch referral overview");
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useReferralPopup(): UseQueryResult<ReferralPopup> {
  return useQuery({
    queryKey: REFERRAL_KEYS.popup,
    queryFn: async () => {
      const res = await api.get<ReferralPopup>("/referrals/popup");
      if (!res.data) throw new Error("Failed to fetch referral popup");
      return res.data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useRecordPopupView(): UseMutationResult<ApiResponse<{ recorded: boolean }>, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (campaignId) => api.post(`/referrals/popup/${campaignId}/view`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: REFERRAL_KEYS.popup });
    },
  });
}

export function useAdminCampaigns(): UseQueryResult<ReferralCampaignItem[]> {
  return useQuery({
    queryKey: REFERRAL_KEYS.campaigns,
    queryFn: async () => {
      const res = await api.get<ReferralCampaignItem[]>("/referrals/campaigns");
      return res.data ?? [];
    },
    staleTime: 30_000,
  });
}

export function useCreateCampaign(): UseMutationResult<unknown, Error, Partial<ReferralCampaignItem>> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto) => api.post("/referrals/campaigns", dto),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: REFERRAL_KEYS.campaigns }); },
  });
}

export function useUpdateCampaign(): UseMutationResult<unknown, Error, { id: string; data: Partial<ReferralCampaignItem> }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.patch(`/referrals/campaigns/${id}`, data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: REFERRAL_KEYS.campaigns }); },
  });
}

export function useDeleteCampaign(): UseMutationResult<unknown, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/referrals/campaigns/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: REFERRAL_KEYS.campaigns }); },
  });
}

export function useAdminReferrals(status?: string, page = 1, limit = 20): UseQueryResult<{ data: AdminReferralItem[]; meta: ReferralPagination }> {
  return useQuery({
    queryKey: [...REFERRAL_KEYS.list, status, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      params.set("page", String(page));
      params.set("limit", String(limit));
      const res = await api.get<{ data: AdminReferralItem[]; meta: ReferralPagination }>(`/referrals/list?${params.toString()}`);
      if (!res.data) throw new Error("Failed to fetch referrals");
      return res.data;
    },
    staleTime: 15_000,
  });
}

export function useReferralStats(): UseQueryResult<ReferralStats> {
  return useQuery({
    queryKey: REFERRAL_KEYS.stats,
    queryFn: async () => {
      const res = await api.get<ReferralStats>("/referrals/stats");
      if (!res.data) throw new Error("Failed to fetch referral stats");
      return res.data;
    },
    staleTime: 15_000,
  });
}

export function useUpdateReferralStatus(): UseMutationResult<unknown, Error, { id: string; status: "APPROVED" | "REJECTED" }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => api.patch(`/referrals/list/${id}/status`, { status }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: REFERRAL_KEYS.list });
      void qc.invalidateQueries({ queryKey: REFERRAL_KEYS.stats });
    },
  });
}
