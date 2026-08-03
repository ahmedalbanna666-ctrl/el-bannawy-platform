import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface TransferNumber {
  id: string;
  gateway: string;
  label: string;
  number: string;
  accountName: string | null;
  active: boolean;
}

export interface ManualPaymentOrder {
  id: string;
  userId: string;
  packageId: string;
  amount: number;
  coinAmount: number;
  gateway: string;
  transferNumber: string;
  senderNumber: string;
  transactionRef: string;
  screenshot: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  package?: { id: string; name: string };
  user?: { id: string; fullName: string; email: string | null; mobileNumber: string | null };
}

export function getScreenshotSrc(screenshot: string | null): string | null {
  if (!screenshot) return null;
  if (screenshot.startsWith("data:")) return screenshot;
  const base64 = screenshot.trim();
  if (base64.startsWith("/9j/")) return `data:image/jpeg;base64,${base64}`;
  if (base64.startsWith("iVBORw0KGgo")) return `data:image/png;base64,${base64}`;
  if (base64.startsWith("UklGR")) return `data:image/webp;base64,${base64}`;
  if (base64.startsWith("R0lGOD")) return `data:image/gif;base64,${base64}`;
  return `data:image/png;base64,${base64}`;
}

export const MANUAL_PAYMENT_KEYS = {
  all: ["manual-payment"] as const,
  transferNumbers: ["manual-payment", "transfer-numbers"] as const,
  allTransferNumbers: ["manual-payment", "transfer-numbers", "all"] as const,
  orders: ["manual-payment", "orders"] as const,
  allOrders: ["manual-payment", "orders", "all"] as const,
  myOrders: ["manual-payment", "orders", "my"] as const,
};

export function useTransferNumbers(): UseQueryResult<TransferNumber[]> {
  return useQuery({
    queryKey: MANUAL_PAYMENT_KEYS.transferNumbers,
    queryFn: async () => {
      const res = await api.get<TransferNumber[]>("/manual-payment/transfer-numbers");
      return res.data ?? [];
    },
    staleTime: 120_000,
  });
}

export function useAllTransferNumbers(): UseQueryResult<TransferNumber[]> {
  return useQuery({
    queryKey: MANUAL_PAYMENT_KEYS.allTransferNumbers,
    queryFn: async () => {
      const res = await api.get<TransferNumber[]>("/manual-payment/transfer-numbers/all");
      return res.data ?? [];
    },
  });
}

export function useCreateTransferNumber(): UseMutationResult<
  TransferNumber | undefined,
  Error,
  { gateway: string; label: string; number: string; accountName?: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { gateway: string; label: string; number: string; accountName?: string }) => {
      const res = await api.post<TransferNumber>("/manual-payment/transfer-numbers", dto);
      return res.data;
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: MANUAL_PAYMENT_KEYS.allTransferNumbers }); },
  });
}

export function useUpdateTransferNumber(): UseMutationResult<
  TransferNumber | undefined,
  Error,
  { id: string; gateway?: string; label?: string; number?: string; accountName?: string; active?: boolean }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: { id: string; gateway?: string; label?: string; number?: string; accountName?: string; active?: boolean }) => {
      const res = await api.patch<TransferNumber>(`/manual-payment/transfer-numbers/${id}`, dto);
      return res.data;
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: MANUAL_PAYMENT_KEYS.allTransferNumbers }); },
  });
}

export function useDeleteTransferNumber(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/manual-payment/transfer-numbers/${id}`);
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: MANUAL_PAYMENT_KEYS.allTransferNumbers }); },
  });
}

export function useSubmitOrder(): UseMutationResult<
  ManualPaymentOrder | undefined,
  Error,
  {
    packageId: string; amount: number; coinAmount: number;
    gateway: string; transferNumber: string;
    senderNumber: string; transactionRef: string; screenshot?: string;
  }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      packageId: string; amount: number; coinAmount: number;
      gateway: string; transferNumber: string;
      senderNumber: string; transactionRef: string; screenshot?: string;
    }) => {
      const res = await api.post<ManualPaymentOrder>("/manual-payment/orders", dto);
      return res.data;
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: MANUAL_PAYMENT_KEYS.myOrders }); },
  });
}

export function useMyOrders(): UseQueryResult<ManualPaymentOrder[]> {
  return useQuery({
    queryKey: MANUAL_PAYMENT_KEYS.myOrders,
    queryFn: async () => {
      const res = await api.get<ManualPaymentOrder[]>("/manual-payment/orders/my");
      return res.data ?? [];
    },
  });
}

export function useAllOrders(status?: string): UseQueryResult<ManualPaymentOrder[]> {
  return useQuery({
    queryKey: [...MANUAL_PAYMENT_KEYS.allOrders, status ?? "all"],
    queryFn: async () => {
      const qs = status ? `?status=${status}` : "";
      const res = await api.get<ManualPaymentOrder[]>(`/manual-payment/orders/all${qs}`);
      return res.data ?? [];
    },
  });
}

export function useReviewOrder(): UseMutationResult<
  ManualPaymentOrder | undefined,
  Error,
  { id: string; status: "APPROVED" | "REJECTED"; adminNote?: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, adminNote }: { id: string; status: "APPROVED" | "REJECTED"; adminNote?: string }) => {
      const res = await api.post<ManualPaymentOrder>(`/manual-payment/orders/${id}/review`, { status, adminNote });
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: MANUAL_PAYMENT_KEYS.allOrders });
      void qc.invalidateQueries({ queryKey: MANUAL_PAYMENT_KEYS.myOrders });
    },
  });
}
