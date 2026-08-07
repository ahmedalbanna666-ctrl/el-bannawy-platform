import { api, type ApiResponse } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";
import { LiveSessionTypeEnum } from "@el-bannawy/shared";

export const LIVE_PRODUCTS = [
  "PRIVATE_PLAN_A",
  "PRIVATE_PLAN_B",
  "GROUP_PLAN_A",
  "GROUP_PLAN_B",
  "ONE_TIME",
  "FREE",
] as const;

export type LiveProductCode = (typeof LIVE_PRODUCTS)[number];

export function liveProductType(code: LiveProductCode): string {
  return code === "FREE" ? "LIVE_FREE" : `LIVE_${code}`;
}

/** Reverse lookup: "LIVE_PRIVATE_PLAN_A" → "PRIVATE_PLAN_A", or null when unsupported. */
export function liveProductCode(productType: string): LiveProductCode | null {
  if (!productType.startsWith("LIVE_")) return null;
  const code = productType.slice("LIVE_".length) as LiveProductCode;
  return (LIVE_PRODUCTS as readonly string[]).includes(code) ? code : null;
}

/** Sessions included per billing period (Plan A = 1/week, Plan B = 2/week). */
export const LIVE_PRODUCT_SESSIONS: Record<LiveProductCode, number> = {
  PRIVATE_PLAN_A: 4,
  PRIVATE_PLAN_B: 8,
  GROUP_PLAN_A: 4,
  GROUP_PLAN_B: 8,
  ONE_TIME: 1,
  FREE: 0,
};

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

export const PRODUCT_META: Record<
  LiveProductCode,
  { label: string; short: string; sessions: string; description: string }
> = {
  PRIVATE_PLAN_A: {
    label: "خطة A فردية",
    short: "حصتان شهرياً",
    sessions: "4 حصص شهرياً · مرة أسبوعياً",
    description: "جلسة خاصة ثابتة أسبوعياً مع معلمك الخاص.",
  },
  PRIVATE_PLAN_B: {
    label: "خطة B فردية",
    short: "4 حصص شهرياً",
    sessions: "8 حصص شهرياً · مرتين أسبوعياً",
    description: "جلسات خاصة مرتين أسبوعياً لمتابعة أسرع.",
  },
  GROUP_PLAN_A: {
    label: "خطة A مجموعة",
    short: "حصتان شهرياً",
    sessions: "4 حصص شهرياً · مرة أسبوعياً",
    description: "حصص مجموعة ثابتة أسبوعياً مع زملائك.",
  },
  GROUP_PLAN_B: {
    label: "خطة B مجموعة",
    short: "4 حصص شهرياً",
    sessions: "8 حصص شهرياً · مرتين أسبوعياً",
    description: "حصص مجموعة مرتين أسبوعياً لتعميق الاستيعاب.",
  },
  ONE_TIME: {
    label: "حصة منفردة",
    short: "حصة واحدة",
    sessions: "حصة واحدة",
    description: "حجز حصة خاصة حسب المواعيد المتاحة.",
  },
  FREE: {
    label: "فعالية مجانية",
    short: "مجانية",
    sessions: "جلسة مجانية",
    description: "انضم لجلسات مباشرة مجانية دورية.",
  },
};
