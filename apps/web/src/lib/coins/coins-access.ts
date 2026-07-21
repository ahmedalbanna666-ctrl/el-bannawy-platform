import { api } from "@/lib/api-client";
import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import {
  useUnlockContent,
  useSubmitUnlockRequest,
  useRedeemCode,
  useUnlockCost,
} from "@/lib/coins/coins-api";

export interface ContentAccess {
  unlocked: boolean;
  hasProgress: boolean;
}

export function useContentAccess(
  targetType: "UNIT" | "LESSON",
  targetId: string | undefined,
): UseQueryResult<ContentAccess> {
  return useQuery({
    queryKey: ["coins", "access", targetType, targetId],
    enabled: !!targetId,
    queryFn: async () => {
      const res = await api.get<ContentAccess>(
        `/coins/access/${targetType}/${targetId ?? ""}`,
      );
      return res.data ?? { unlocked: false, hasProgress: false };
    },
    staleTime: 15_000,
  });
}

export interface UseUnitUnlockResult {
  access: UseQueryResult<ContentAccess>;
  unlock: (onDone?: (err?: unknown) => void) => void;
  request: (onDone?: (err?: unknown) => void) => void;
  redeem: (code: string, onDone?: (err?: unknown, result?: { coinsAdded: number; unlocked: boolean }) => void) => void;
  unlocking: boolean;
  requesting: boolean;
  redeeming: boolean;
  cost: number;
}

export function useUnitUnlock(unitId: string | undefined): UseUnitUnlockResult {
  const qc = useQueryClient();
  const access = useContentAccess("UNIT", unitId);
  const { data: costData } = useUnlockCost("UNIT");
  const unlockMut = useUnlockContent();
  const requestMut = useSubmitUnlockRequest();
  const redeemMut = useRedeemCode();

  const cost = costData?.cost ?? 50;

  const invalidate = (): void => {
    void qc.invalidateQueries({ queryKey: ["coins", "access", "UNIT", unitId] });
    void qc.invalidateQueries({ queryKey: ["curriculum"] });
    void qc.invalidateQueries({ queryKey: ["coins", "wallet"] });
  };

  const unlock = (onDone?: (err?: unknown) => void): void => {
    unlockMut.mutate(
      { targetType: "UNIT", targetId: unitId ?? "" },
      {
        onSuccess: () => { invalidate(); onDone?.(); },
        onError: (err) => { onDone?.(err); },
      },
    );
  };

  const request = (onDone?: (err?: unknown) => void): void => {
    requestMut.mutate(
      { targetType: "UNIT", targetId: unitId ?? "" },
      {
        onSuccess: () => { invalidate(); onDone?.(); },
        onError: (err) => { onDone?.(err); },
      },
    );
  };

  const redeem = (code: string, onDone?: (err?: unknown, result?: { coinsAdded: number; unlocked: boolean }) => void): void => {
    redeemMut.mutate(code, {
      onSuccess: (res) => {
        invalidate();
        const data = res.data;
        onDone?.(undefined, data);
      },
      onError: (err) => { onDone?.(err); },
    });
  };

  return {
    access,
    unlock,
    request,
    redeem,
    unlocking: unlockMut.isPending,
    requesting: requestMut.isPending,
    redeeming: redeemMut.isPending,
    cost,
  };
}
