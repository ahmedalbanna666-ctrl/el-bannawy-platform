"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { NAV_REGISTRY } from "@/lib/nav-registry";

export interface PageStatusEntry {
  disabled: boolean;
  title: string;
  message: string;
  whatsapp: string;
}

export interface PageStatusConfig {
  global: PageStatusEntry;
  pages: Record<string, PageStatusEntry>;
}

export const EMPTY_PAGE_STATUS: PageStatusConfig = {
  global: { disabled: false, title: "", message: "", whatsapp: "" },
  pages: {},
};

export const DEFAULT_PAGE_TITLE = "هذه الصفحة قيد التطوير";
export const DEFAULT_PAGE_MESSAGE = "نعمل على تطوير هذه الصفحة وستكون متاحة قريباً، نعتذر عن أي إزعاج.";
export const DEFAULT_GLOBAL_TITLE = "المنصة قيد التطوير";
export const DEFAULT_GLOBAL_MESSAGE = "نعمل على تطوير المنصة وستكون متاحة قريباً، نعتذر عن أي إزعاج. يمكنك التواصل مع الدعم الفني.";
export const DEFAULT_WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

export interface ControllablePage {
  key: string;
  title: string;
  description: string;
}

export const CONTROLLABLE_PAGES: readonly ControllablePage[] = NAV_REGISTRY.filter(
  (m) => m.route.startsWith("/dashboard") && !m.route.startsWith("/dashboard/admin") && m.id !== "home",
).map((m) => ({ key: m.id, title: m.title, description: m.description }));

export function getPageKeyFromPath(pathname: string): string | null {
  if (!pathname.startsWith("/dashboard")) return null;
  let best: { id: string; route: string } | null = null;
  for (const m of NAV_REGISTRY) {
    if (m.route === "/dashboard") continue;
    if (pathname === m.route || pathname.startsWith(`${m.route}/`)) {
      if (!best || m.route.length > best.route.length) {
        best = { id: m.id, route: m.route };
      }
    }
  }
  return best?.id ?? null;
}

export function buildWhatsAppLink(whatsapp: string): string {
  const digits = whatsapp.replace(/\D/g, "").replace(/^0/, "");
  return `https://wa.me/${digits}`;
}

export function usePageStatus(): {
  data: PageStatusConfig | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const query = useQuery<PageStatusConfig>({
    queryKey: ["page-status"],
    queryFn: async () => {
      const res = await api.get<PageStatusConfig>("/page-status");
      return res.data ?? EMPTY_PAGE_STATUS;
    },
    staleTime: 30_000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export function useUpdatePageStatus(): {
  mutate: (params: {
    scope: "global" | "page";
    pageKey?: string;
    payload: Partial<PageStatusEntry>;
  }) => void;
  isPending: boolean;
} {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (params: {
      scope: "global" | "page";
      pageKey?: string;
      payload: Partial<PageStatusEntry>;
    }): Promise<PageStatusConfig> => {
      const endpoint =
        params.scope === "global" ? "/page-status/global" : `/page-status/pages/${params.pageKey ?? ""}`;
      const res = await api.patch<PageStatusConfig>(endpoint, params.payload);
      return res.data ?? EMPTY_PAGE_STATUS;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["page-status"] });
    },
  });

  return {
    mutate: (params: {
      scope: "global" | "page";
      pageKey?: string;
      payload: Partial<PageStatusEntry>;
    }): void => { mutation.mutate(params); },
    isPending: mutation.isPending,
  };
}
