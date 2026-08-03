"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useUiSettings } from "@/lib/use-ui-settings";
import { getCardBorderPageKey } from "@/lib/card-border-pages";

const STAFF_ROLES = new Set(["ADMINISTRATOR", "TEACHER", "STAFF", "SUPPORT", "SECRETARY"]);

export function CardBorderScope({ children }: { children: ReactNode }): ReactNode {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.role);
  const { config } = useUiSettings();

  if (!config) return <div>{children}</div>;

  const pageKey = getCardBorderPageKey(pathname);
  const isAuthPage = pageKey === "login" || pageKey === "register";
  const groupKey = isAuthPage ? "auth" : role && STAFF_ROLES.has(role) ? "staff" : "student";
  const group = config.cardBorder.groups[groupKey];

  const active = pageKey !== null && group.enabled && group.pages.includes(pageKey);

  const vars = active
    ? ({
        "--ui-card-border-color": group.color,
        "--ui-card-border-color-dark": group.colorDark || group.color,
        "--ui-card-border-width": `${String(group.width)}px`,
      } as CSSProperties)
    : undefined;

  return (
    <div data-card-border={active ? "" : undefined} data-ui-card-border-side={active ? group.side : undefined} style={vars}>
      {children}
    </div>
  );
}
