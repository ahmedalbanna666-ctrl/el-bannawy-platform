import { api, type ApiResponse } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";

export interface CoinPackageItem {
  id: string;
  name: string;
  description: string | null;
  coinAmount: number;
  price: number;
  active: boolean;
  createdAt: string;
}

export interface CoinWalletItem {
  id: string;
  userId: string;
  balance: number;
  updatedAt: string;
}

export interface CoinPurchaseItem {
  id: string;
  userId: string;
  packageId: string;
  coinAmount: number;
  price: number;
  status: string;
  createdAt: string;
  package?: CoinPackageItem;
}

export interface UnlockCodeItem {
  id: string;
  code: string;
  coinAmount: number;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  expiresAt: string | null;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
  _count?: { redemptions: number };
}

export interface ContentUnlockItem {
  id: string;
  userId: string;
  targetType: string;
  targetId: string;
  unlockMethod: string;
  coinAmount: number | null;
  createdAt: string;
}

export interface UnlockRequestItem {
  id: string;
  userId: string;
  targetType: string;
  targetId: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  user?: { id: string; fullName: string; email: string | null };
}

export const COINS_KEYS = {
  all: ["coins"] as const,
  packages: ["coins", "packages"] as const,
  allPackages: ["coins", "packages", "all"] as const,
  wallet: ["coins", "wallet"] as const,
  codes: ["coins", "codes"] as const,
  requests: ["coins", "requests"] as const,
  myRequests: ["coins", "my-requests"] as const,
  myUnlocks: ["coins", "my-unlocks"] as const,
  myPurchases: ["coins", "my-purchases"] as const,
};

export function useUnlockCost(targetType: string): UseQueryResult<{ cost: number }> {
  return useQuery({
    queryKey: ["coins", "unlock-cost", targetType],
    queryFn: async () => {
      const res = await api.get<{ cost: number }>(`/coins/unlock-cost/${targetType}`);
      if (!res.data) throw new Error("Failed to fetch unlock cost");
      return res.data;
    },
    staleTime: 60_000,
  });
}

export function useSetUnlockCost(): UseMutationResult<
  ApiResponse<{ cost: number }>,
  Error,
  { targetType: string; cost: number }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto) => api.post("/coins/unlock-cost", dto),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["coins", "unlock-cost"] }); },
  });
}

export function useCoinPackages(): UseQueryResult<CoinPackageItem[]> {
  return useQuery({
    queryKey: COINS_KEYS.packages,
    queryFn: async () => {
      const res = await api.get<CoinPackageItem[]>("/coins/packages");
      return res.data ?? [];
    },
    staleTime: 60_000,
  });
}

export function useAllCoinPackages(): UseQueryResult<CoinPackageItem[]> {
  return useQuery({
    queryKey: COINS_KEYS.allPackages,
    queryFn: async () => {
      const res = await api.get<CoinPackageItem[]>("/coins/packages/all");
      return res.data ?? [];
    },
    staleTime: 30_000,
  });
}

export function useCreatePackage(): UseMutationResult<unknown, Error, { name: string; description?: string; coinAmount: number; price: number }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto) => api.post("/coins/packages", dto),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: COINS_KEYS.allPackages }); },
  });
}

export function useUpdatePackage(): UseMutationResult<unknown, Error, { id: string; data: Partial<{ name: string; description: string; coinAmount: number; price: number; active: boolean }> }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.patch(`/coins/packages/${id}`, data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: COINS_KEYS.allPackages }); },
  });
}

export function useDeletePackage(): UseMutationResult<unknown, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/coins/packages/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: COINS_KEYS.allPackages }); },
  });
}

export function useCoinWallet(): UseQueryResult<CoinWalletItem> {
  return useQuery({
    queryKey: COINS_KEYS.wallet,
    queryFn: async () => {
      const res = await api.get<CoinWalletItem>("/coins/wallet");
      if (!res.data) throw new Error("Wallet not found");
      return res.data;
    },
    staleTime: 30_000,
  });
}

export interface CoinPurchase {
  id: string;
  userId: string;
  packageId: string;
  paymentId: string | null;
  coinAmount: number;
  price: number;
  status: string;
  createdAt: string;
}

export interface CoinCheckout {
  checkoutId: string;
  paymentUrl: string;
  amount: number;
}

export function usePurchasePackage(): UseMutationResult<ApiResponse<CoinCheckout>, Error, { packageId: string; paymentMethod: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto) => api.post<CoinCheckout>("/coins/purchase", dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: COINS_KEYS.myPurchases });
    },
  });
}

export function useVerifyCoinPurchase(): UseMutationResult<
  ApiResponse<{ verified: boolean; status: string; coinsAdded: number }>,
  Error,
  { checkoutId: string; paymentMethod?: string; gatewayRef?: string; rawPayload?: Record<string, unknown> }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto) => api.post("/coins/verify", dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: COINS_KEYS.myPurchases });
      void qc.invalidateQueries({ queryKey: COINS_KEYS.wallet });
    },
  });
}

export function useUnlockContent(): UseMutationResult<unknown, Error, { targetType: string; targetId: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto) => api.post("/coins/unlock", dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: COINS_KEYS.wallet });
      void qc.invalidateQueries({ queryKey: COINS_KEYS.myUnlocks });
    },
  });
}

export function useRedeemCode(): UseMutationResult<
  ApiResponse<{ coinsAdded: number; unlocked: boolean }>,
  Error,
  string
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code) => api.post<{ coinsAdded: number; unlocked: boolean }>("/coins/redeem", { code }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: COINS_KEYS.wallet });
      void qc.invalidateQueries({ queryKey: ["coins", "access"] });
    },
  });
}

export function useUnlockCodes(): UseQueryResult<UnlockCodeItem[]> {
  return useQuery({
    queryKey: COINS_KEYS.codes,
    queryFn: async () => {
      const res = await api.get<UnlockCodeItem[]>("/coins/codes");
      return res.data ?? [];
    },
    staleTime: 30_000,
  });
}

export function useCreateUnlockCode(): UseMutationResult<unknown, Error, { code?: string; coinAmount: number; maxUses?: number; expiresAt?: string; targetType?: string; targetId?: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto) => api.post("/coins/codes", dto),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: COINS_KEYS.codes }); },
  });
}

export function useToggleCodeActive(): UseMutationResult<unknown, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/coins/codes/${id}/toggle`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: COINS_KEYS.codes }); },
  });
}

export function useUnlockRequests(status?: string): UseQueryResult<UnlockRequestItem[]> {
  return useQuery({
    queryKey: [...COINS_KEYS.requests, status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : "";
      const res = await api.get<UnlockRequestItem[]>(`/coins/requests${params}`);
      return res.data ?? [];
    },
    staleTime: 15_000,
  });
}

export function useMyUnlockRequests(): UseQueryResult<UnlockRequestItem[]> {
  return useQuery({
    queryKey: COINS_KEYS.myRequests,
    queryFn: async () => {
      const res = await api.get<UnlockRequestItem[]>("/coins/my-requests");
      return res.data ?? [];
    },
    staleTime: 15_000,
  });
}

export function useSubmitUnlockRequest(): UseMutationResult<unknown, Error, { targetType: string; targetId: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto) => api.post("/coins/requests", dto),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: COINS_KEYS.myRequests }); },
  });
}

export function useResolveUnlockRequest(): UseMutationResult<unknown, Error, { id: string; status: string; adminNote?: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, adminNote }) => api.post(`/coins/requests/${id}/resolve`, { status, adminNote }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: COINS_KEYS.requests }); },
  });
}

export function useMyUnlocks(): UseQueryResult<ContentUnlockItem[]> {
  return useQuery({
    queryKey: COINS_KEYS.myUnlocks,
    queryFn: async () => {
      const res = await api.get<ContentUnlockItem[]>("/coins/my-unlocks");
      return res.data ?? [];
    },
    staleTime: 30_000,
  });
}

export function useMyPurchases(): UseQueryResult<CoinPurchaseItem[]> {
  return useQuery({
    queryKey: COINS_KEYS.myPurchases,
    queryFn: async () => {
      const res = await api.get<CoinPurchaseItem[]>("/coins/my-purchases");
      return res.data ?? [];
    },
    staleTime: 30_000,
  });
}
