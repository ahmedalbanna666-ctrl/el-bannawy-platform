"use client";

import { type ReactNode } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { usePageStatus, DEFAULT_PAGE_TITLE, DEFAULT_PAGE_MESSAGE, DEFAULT_GLOBAL_TITLE, DEFAULT_GLOBAL_MESSAGE } from "@/lib/page-status";
import { MaintenanceScreen } from "@/components/ui/maintenance-screen";

interface PageStatusGateProps {
  pageKey: string | null;
  children: ReactNode;
}

export function PageStatusGate({ pageKey, children }: PageStatusGateProps): ReactNode {
  const userRole = useAuthStore((s) => s.user?.role);
  const { data } = usePageStatus();

  if (userRole !== "STUDENT") return children;

  const global = data?.global;
  const page = pageKey && data?.pages ? data.pages[pageKey] : undefined;

  if (global?.disabled) {
    return (
      <MaintenanceScreen
        title={global.title || DEFAULT_GLOBAL_TITLE}
        message={global.message || DEFAULT_GLOBAL_MESSAGE}
        whatsapp={global.whatsapp}
      />
    );
  }

  if (page?.disabled) {
    return (
      <MaintenanceScreen
        title={page.title || DEFAULT_PAGE_TITLE}
        message={page.message || DEFAULT_PAGE_MESSAGE}
        whatsapp={page.whatsapp || global?.whatsapp}
      />
    );
  }

  return children;
}
