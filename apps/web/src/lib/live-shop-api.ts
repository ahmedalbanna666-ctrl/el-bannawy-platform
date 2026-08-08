import { api, type ApiResponse } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";
import { LiveSessionTypeEnum } from "@el-bannawy/shared";

/** Legacy seeded plan codes. The source of truth is the LivePricingPlan table. */
export const LIVE_PRODUCTS = [
  "PRIVATE_PLAN_A",
  "PRIVATE_PLAN_B",
  "GROUP_PLAN_A",
  "GROUP_PLAN_B",
  "ONE_TIME",
  "FREE",
] as const;

/** A live plan code (legacy seeded codes or admin-created custom codes). */
export type LiveProductCode = string;

export function liveProductType(code: LiveProductCode): string {
  return `LIVE_${code}`;
}

/** Reverse lookup: "LIVE_PRIVATE_PLAN_A" → "PRIVATE_PLAN_A", or null for non-live types. */
export function liveProductCode(productType: string): LiveProductCode | null {
  if (!productType.startsWith("LIVE_")) return null;
  const code = productType.slice("LIVE_".length);
  return code.length > 0 ? code : null;
}

/** Admin-managed sellable live plan (mirrors the backend LivePricingPlan). */
export interface LivePricingPlan {
  id: string;
  code: string;
  name: string;
  short: string;
  description: string;
  type: "PRIVATE" | "GROUP" | "ONE_TIME" | "FREE";
  price: number;
  sessionCount: number;
  benefits: string[];
  isActive: boolean;
  sortOrder: number;
}

export interface LivePricingPlanInput {
  code: string;
  name: string;
  short: string;
  description: string;
  type: LivePricingPlan["type"];
  price: number;
  sessionCount: number;
  benefits?: string[];
  isActive?: boolean;
  sortOrder?: number;
}

export type LivePricingData = Record<LiveProductCode, number>;

export interface StudyScheduleDay {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  type: string;
  maxStudents: number;
}

export interface StudyScheduleItem {
  id: string;
  teacherId: string;
  name: string;
  type: string;
  maxStudents: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  days: StudyScheduleDay[];
}

export interface CreateStudyScheduleDto {
  name: string;
  type: LiveSessionTypeEnum | "PRIVATE" | "GROUP";
  maxStudents?: number;
  gradeId?: string;
  days: { dayOfWeek: number; startTime: string; endTime: string; maxStudents?: number }[];
}

export interface UpdateStudyScheduleDto {
  name?: string;
  type?: string;
  maxStudents?: number;
  gradeId?: string | null;
  isActive?: boolean;
  days?: { dayOfWeek: number; startTime: string; endTime: string; maxStudents?: number }[];
}

export interface CheckoutPayload {
  productType: string;
  productId: string;
  paymentMethod: string;
  couponCode?: string;
  metadata?: Record<string, unknown>;
}

export interface CheckoutResult {
  checkoutId: string;
  paymentUrl: string;
  amount: number;
  discount: number;
  signature: string;
  expiresAt: string;
}

export interface SubmitProofPayload {
  paymentId: string;
  gatewayRef: string;
  senderNumber: string;
  transactionRef: string;
  screenshot?: string;
}

export interface ApprovalPaymentItem {
  id: string;
  userId: string;
  productType: string;
  productId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  gatewayRef: string | null;
  metadata: unknown;
  proofGatewayRef: string | null;
  proofSenderNumber: string | null;
  proofTransactionRef: string | null;
  proofScreenshot: string | null;
  adminNote: string | null;
  discount: number;
  createdAt: string;
  completedAt: string | null;
  user: {
    id: string;
    fullName: string;
    email: string | null;
    mobileNumber: string | null;
  };
}

export const LIVE_SHOP_KEYS = {
  schedules: ["live", "schedules"] as const,
  schedule: (id: string) => ["live", "schedules", id] as const,
  pricing: ["live", "products", "pricing"] as const,
  plans: ["live", "products", "plans"] as const,
  approvals: ["payments", "approvals"] as const,
};

export function useStudySchedules(teacherId?: string): UseQueryResult<StudyScheduleItem[]> {
  return useQuery({
    queryKey: [...LIVE_SHOP_KEYS.schedules, teacherId ?? "all"],
    queryFn: async () => {
      const qs = teacherId ? `?teacherId=${encodeURIComponent(teacherId)}` : "";
      const res = await api.get<StudyScheduleItem[]>(`/live/schedules${qs}`);
      return res.data ?? [];
    },
    staleTime: 15_000,
  });
}

export function useCreateStudySchedule(): UseMutationResult<ApiResponse<{ id: string }>, Error, CreateStudyScheduleDto> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateStudyScheduleDto) => api.post<{ id: string }>("/live/schedules", dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIVE_SHOP_KEYS.schedules });
    },
  });
}

export function useUpdateStudySchedule(): UseMutationResult<ApiResponse<unknown>, Error, { id: string; dto: UpdateStudyScheduleDto }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateStudyScheduleDto }) =>
      api.patch<unknown>(`/live/schedules/${id}`, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIVE_SHOP_KEYS.schedules });
    },
  });
}

export function useDeleteStudySchedule(): UseMutationResult<unknown, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/live/schedules/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIVE_SHOP_KEYS.schedules });
    },
  });
}

/** Active sellable live plans (the shop's source of truth). */
export function useLivePlans(): UseQueryResult<LivePricingPlan[]> {
  return useQuery({
    queryKey: LIVE_SHOP_KEYS.plans,
    queryFn: async () => {
      const res = await api.get<LivePricingPlan[]>("/live/products/plans");
      return res.data ?? [];
    },
    staleTime: 60_000,
  });
}

export function useCreateLivePlan(): UseMutationResult<ApiResponse<LivePricingPlan>, Error, LivePricingPlanInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: LivePricingPlanInput) => api.post<LivePricingPlan>("/live/products/plans", dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIVE_SHOP_KEYS.plans });
    },
  });
}

export function useUpdateLivePlan(): UseMutationResult<
  ApiResponse<LivePricingPlan>,
  Error,
  { code: string; dto: Partial<LivePricingPlanInput> }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, dto }: { code: string; dto: Partial<LivePricingPlanInput> }) =>
      api.patch<LivePricingPlan>(`/live/products/plans/${encodeURIComponent(code)}`, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIVE_SHOP_KEYS.plans });
    },
  });
}

export function useDeleteLivePlan(): UseMutationResult<unknown, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.delete(`/live/products/plans/${encodeURIComponent(code)}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIVE_SHOP_KEYS.plans });
    },
  });
}

export function useLivePricing(): UseQueryResult<LivePricingData> {
  return useQuery({
    queryKey: LIVE_SHOP_KEYS.pricing,
    queryFn: async () => {
      const res = await api.get<LivePricingData>("/live/products/pricing");
      if (!res.data) throw new Error("Pricing unavailable");
      return res.data;
    },    staleTime: 60_000,
  });
}

export function useUpdateLivePricing(): UseMutationResult<ApiResponse<unknown>, Error, Record<string, number>> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prices: Record<string, number>) => api.put<unknown>("/live/products/pricing", prices),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIVE_SHOP_KEYS.pricing });
    },
  });
}

export function useLiveCheckout(): UseMutationResult<CheckoutResult, Error, CheckoutPayload> {
  return useMutation({
    mutationFn: async (payload: CheckoutPayload) => {
      const res = await api.post<CheckoutResult>("/payments/checkout", payload);
      if (!res.data) throw new Error("Checkout failed");
      return res.data;
    },
  });
}

export function useSubmitPaymentProof(): UseMutationResult<unknown, Error, SubmitProofPayload> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SubmitProofPayload) => {
      await api.post("/payments/proof", payload);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIVE_SHOP_KEYS.approvals });
    },
  });
}

export function usePaymentApprovals(): UseQueryResult<ApprovalPaymentItem[]> {
  return useQuery({
    queryKey: LIVE_SHOP_KEYS.approvals,
    queryFn: async () => {
      const res = await api.get<ApprovalPaymentItem[]>("/payments/approvals/list");
      return res.data ?? [];
    },
    staleTime: 15_000,
  });
}

export function useReviewPayment(): UseMutationResult<unknown, Error, { paymentId: string; decision: "APPROVED" | "REJECTED"; adminNote?: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ paymentId, decision, adminNote }: { paymentId: string; decision: "APPROVED" | "REJECTED"; adminNote?: string }) => {
      await api.post(`/payments/${paymentId}/review`, { decision, adminNote });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIVE_SHOP_KEYS.approvals });
    },
  });
}
