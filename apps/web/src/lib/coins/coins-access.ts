import { api } from "@/lib/api-client";
import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import {
  useUnlockContent,
  useSubmitUnlockRequest,
} from "@/lib/coins/coins-api";

export const UNIT_UNLOCK_COST = 50;
export const LESSON_UNLOCK_COST = 20;

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
  unlocking: boolean;
  requesting: boolean;
}

export function useUnitUnlock(unitId: string | undefined): UseUnitUnlockResult {
  const qc = useQueryClient();
  const access = useContentAccess("UNIT", unitId);
  const unlockMut = useUnlockContent();
  const requestMut = useSubmitUnlockRequest();

  const invalidate = (): void => {
    void qc.invalidateQueries({ queryKey: ["coins", "access", "UNIT", unitId] });
    void qc.invalidateQueries({ queryKey: ["curriculum"] });
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

  return {
    access,
    unlock,
    request,
    unlocking: unlockMut.isPending,
    requesting: requestMut.isPending,
  };
}
