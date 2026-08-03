"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { ChevronLeft, X, type LucideIcon } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { ROLE_LABELS } from "@el-bannawy/shared";

interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  badge?: number;
  danger?: boolean;
  divider?: boolean;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

type SidebarContent = (SidebarItem | SidebarSection)[];

interface SidebarProps {
  items: SidebarContent;
  className?: string;
  onClose?: () => void;
  onProfileClick?: () => void;
  profileGrade?: string;
  children?: ReactNode;
}

function isSection(item: SidebarItem | SidebarSection): item is SidebarSection {
  return "items" in item && Array.isArray(item.items);
}

function isDivider(item: SidebarItem): boolean {
  return item.divider === true;
}

export function Sidebar({ items, className, onClose, onProfileClick, profileGrade, children }: SidebarProps): ReactNode {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuthStore();

  const fullName = user?.fullName ?? "";
  const firstName = fullName ? fullName.split(" ")[0] : "";
  const gradeLabel = profileGrade ?? (user?.role ? ROLE_LABELS[user.role] ?? user.role : "Student");
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName || "User")}&background=22D3EE&color=fff&bold=true&font-size=0.33`;

  const handleItemClick = (item: SidebarItem): void => {
    if (item.divider) return;
    item.onClick?.();
    onClose?.();
  };

  const renderItem = (item: SidebarItem, key: string): ReactNode => {
    const content = (
      <>
        <item.icon className={iconClass(item)} />
        {!collapsed && (
          <>
            <span className="flex-1 text-start">{item.label}</span>
            {item.badge !== undefined && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-400 px-1.5 text-[10px] font-bold text-white">
                {item.badge}
              </span>
            )}
          </>
        )}
      </>
    );
    const className = navItemClass(item);
    const title = collapsed ? item.label : undefined;

    if (item.href) {
      return (
        <Link
          key={key}
          href={item.href}
          onClick={(): void => { onClose?.(); }}
          className={className}
          title={title}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        key={key}
        onClick={(): void => { handleItemClick(item); }}
        className={className}
        title={title}
      >
        {content}
      </button>
    );
  };

  const navItemClass = (item: SidebarItem): string =>
    cn(
      "flex w-full items-center gap-3 rounded-[14px] px-[15px] py-2.5 text-[0.95rem] font-bold transition-all duration-200",
      !collapsed && "justify-start",
      collapsed && "justify-center px-0 py-2.5",
      item.active
        ? "bg-primary-400/10 text-primary-400"
        : item.danger
          ? "border border-danger-500/20 bg-danger-500/6 text-neutral-100 hover:bg-danger-500 hover:text-white hover:shadow-[0_5px_15px_rgba(239,68,68,0.3)] light:border-danger-500/25 light:bg-danger-500/4 light:text-neutral-900"
          : "text-neutral-100 hover:-translate-x-1 hover:bg-neutral-800/80 hover:text-primary-400 hover:backdrop-blur-sm hover:border hover:border-white/10 light:text-neutral-900 light:hover:bg-neutral-100 light:hover:text-primary-600 light:hover:border-neutral-200",
    );

  const iconColorMap: Record<string, string> = {
    home: "text-cyan-400",
    units: "text-blue-400",
    live: "text-green-400",
    ai: "text-purple-400",
    "ai-knowledge-base": "text-indigo-400",
    "ai-settings": "text-slate-400",
    users: "text-emerald-400",
    reports: "text-rose-400",
    settings: "text-neutral-400",
    mistakes: "text-red-400",
    games: "text-fuchsia-400",
    "teacher-games": "text-fuchsia-400",
    achievements: "text-amber-400",
    leaderboard: "text-yellow-400",
    competitions: "text-violet-400",
    coins: "text-yellow-400",
    payments: "text-green-400",
    communication: "text-cyan-400",
    "page-status": "text-orange-400",
    "saved-pdfs": "text-teal-400",
    support: "text-cyan-400",
    notifications: "text-sky-400",
    "notification-preferences": "text-neutral-400",
    "admin-notifications": "text-sky-400",
    shop: "text-amber-400",
  };

  const iconClass = (item: SidebarItem): string =>
    cn(
      "h-[1.3rem] w-[1.3rem] shrink-0 transition-colors duration-200",
      item.danger
        ? "text-danger-500"
        : item.active
          ? "text-primary-400"
          : iconColorMap[item.id] ?? "text-neutral-400 light:text-neutral-500",
    );

  return (
    <aside
      className={cn(
        "app-sidebar flex h-dvh flex-col overflow-hidden border-l border-white/10 bg-transparent transition-[width] duration-300 ease-in-out dark:bg-transparent light:border-neutral-200",
        collapsed ? "w-[72px] px-3" : "w-[280px] px-5",
        className,
      )}
    >
      {/* Brand + Collapse Toggle (fixed, never scrolls) */}
      <div className="flex shrink-0 items-center justify-between pt-4">
        {!collapsed ? (
          <span className="font-cairo text-lg font-black text-neutral-50 light:text-neutral-900">
            MR.{" "}
            <span className="text-primary-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">
              AL-BANNA
            </span>
          </span>
        ) : (
          <span className="font-cairo text-lg font-black text-primary-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">
            B
          </span>
        )}
        <div className="flex items-center gap-1">
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-danger-500/15 text-danger-500 transition-all hover:bg-danger-500 hover:text-white hover:shadow-[0_0_12px_rgba(239,68,68,0.4)] light:bg-danger-100 light:text-danger-600 light:hover:bg-danger-500 light:hover:text-white lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={(): void => { setCollapsed(!collapsed); }}
            className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-white/10 hover:text-white light:text-neutral-500 light:hover:bg-neutral-100 light:hover:text-neutral-700 max-lg:hidden"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft
              className={cn(
                "h-5 w-5 transition-transform duration-300",
                collapsed && "rotate-180",
              )}
            />
          </button>
        </div>
      </div>

      {/* Compact Profile Card */}
      {!collapsed && (
        <div
          onClick={onProfileClick}
          onKeyDown={(e): void => { if (e.key === "Enter" || e.key === " ") { onProfileClick?.(); } }}
          role="button"
          tabIndex={0}
          className="group my-3 cursor-pointer rounded-[16px] border border-primary-400/20 bg-neutral-900/65 p-4 backdrop-blur-xl shadow-[0_4px_12px_rgba(0,0,0,0.2),0_0_12px_rgba(34,211,238,0.08)] transition-all duration-200 hover:border-primary-400/40 hover:bg-neutral-800/70 light:border-neutral-200 light:bg-white/85 light:shadow-[0_2px_8px_rgba(0,0,0,0.04)] light:hover:bg-white"
        >
          <div className="flex items-center gap-3">
            <img
              src={avatarUrl}
              alt=""
              className="h-[40px] w-[40px] shrink-0 rounded-full border-2 border-primary-400 shadow-[0_0_10px_rgba(34,211,238,0.15)] object-cover"
            />
            <div className="flex flex-col justify-center gap-0.5 min-w-0">
              <span className="text-[0.95rem] font-extrabold leading-tight text-neutral-50 break-words light:text-neutral-900">
                {firstName || "Student"}
              </span>
              <span className="text-[0.72rem] font-semibold leading-tight text-neutral-400 break-words light:text-neutral-500">
                {gradeLabel}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation (scrollable region) */}
      <nav
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain py-2",
          "[scrollbar-width:thin]",
          "[scrollbar-color:rgba(255,255,255,0.18)_transparent]",
          "[&::-webkit-scrollbar]:w-1.5",
          "[&::-webkit-scrollbar-track]:bg-transparent",
          "[&::-webkit-scrollbar-thumb]:rounded-full",
          "[&::-webkit-scrollbar-thumb]:bg-white/15",
          "hover:[&::-webkit-scrollbar-thumb]:bg-white/40",
          "light:[&::-webkit-scrollbar-thumb]:bg-neutral-300/70",
          "light:hover:[&::-webkit-scrollbar-thumb]:bg-neutral-400",
        )}
      >
        {items.map((entry, _idx) => {
          if (isSection(entry)) {
            return (
              <div key={entry.title}>
                <ul className="flex flex-col gap-1">
                  {entry.items.filter((item) => !isDivider(item)).map((item) => (
                    <li key={item.id}>
                      {renderItem(item, item.id)}
                    </li>
                  ))}
                </ul>
              </div>
            );
          }

          if (isDivider(entry)) {
            return (
              <div
                key={entry.id}
                className="my-2 border-t border-white/10 light:border-neutral-200"
              />
            );
          }

          return renderItem(entry, entry.id);
        })}

        {!collapsed && children && (
          <div className="mt-3 border-t border-white/5 pt-3 light:border-neutral-200">
            {children}
          </div>
        )}
      </nav>

      {/* Social Media Icons */}
      <SocialSidebarIcons collapsed={collapsed} />
    </aside>
  );
}

// ── Platform Config ──────────────────────────────────────────────────

interface PlatformStyle {
  readonly color: string;
  readonly bg: string;
  readonly hoverBg: string;
  readonly hoverShadow: string;
  readonly lightColor: string;
  readonly lightBg: string;
  readonly lightHoverBg: string;
  readonly svg: ReactNode;
}

const PLATFORM_CONFIG: Record<string, PlatformStyle> = {
  youtube: {
    color: "text-red-500",
    bg: "bg-red-600/15",
    hoverBg: "hover:bg-red-600",
    hoverShadow: "hover:shadow-[0_0_12px_rgba(239,68,68,0.4)]",
    lightColor: "light:text-red-600",
    lightBg: "light:bg-red-100",
    lightHoverBg: "light:hover:bg-red-500 light:hover:text-white",
    svg: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>,
  },
  facebook: {
    color: "text-blue-500",
    bg: "bg-blue-600/15",
    hoverBg: "hover:bg-blue-600",
    hoverShadow: "hover:shadow-[0_0_12px_rgba(37,99,235,0.4)]",
    lightColor: "light:text-blue-600",
    lightBg: "light:bg-blue-100",
    lightHoverBg: "light:hover:bg-blue-500 light:hover:text-white",
    svg: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>,
  },
  instagram: {
    color: "text-pink-500",
    bg: "bg-pink-600/15",
    hoverBg: "hover:bg-pink-600",
    hoverShadow: "hover:shadow-[0_0_12px_rgba(236,72,153,0.4)]",
    lightColor: "light:text-pink-600",
    lightBg: "light:bg-pink-100",
    lightHoverBg: "light:hover:bg-pink-500 light:hover:text-white",
    svg: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" /></svg>,
  },
  whatsapp: {
    color: "text-green-500",
    bg: "bg-green-600/15",
    hoverBg: "hover:bg-green-600",
    hoverShadow: "hover:shadow-[0_0_12px_rgba(22,163,74,0.4)]",
    lightColor: "light:text-green-600",
    lightBg: "light:bg-green-100",
    lightHoverBg: "light:hover:bg-green-500 light:hover:text-white",
    svg: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" /></svg>,
  },
  twitter: {
    color: "text-sky-500",
    bg: "bg-sky-600/15",
    hoverBg: "hover:bg-sky-600",
    hoverShadow: "hover:shadow-[0_0_12px_rgba(14,165,233,0.4)]",
    lightColor: "light:text-sky-600",
    lightBg: "light:bg-sky-100",
    lightHoverBg: "light:hover:bg-sky-500 light:hover:text-white",
    svg: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>,
  },
  tiktok: {
    color: "text-neutral-800",
    bg: "bg-neutral-600/15",
    hoverBg: "hover:bg-neutral-800",
    hoverShadow: "hover:shadow-[0_0_12px_rgba(38,38,38,0.4)]",
    lightColor: "light:text-neutral-800",
    lightBg: "light:bg-neutral-100",
    lightHoverBg: "light:hover:bg-neutral-500 light:hover:text-white",
    svg: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>,
  },
  telegram: {
    color: "text-sky-500",
    bg: "bg-sky-600/15",
    hoverBg: "hover:bg-sky-600",
    hoverShadow: "hover:shadow-[0_0_12px_rgba(14,165,233,0.4)]",
    lightColor: "light:text-sky-600",
    lightBg: "light:bg-sky-100",
    lightHoverBg: "light:hover:bg-sky-500 light:hover:text-white",
    svg: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>,
  },
  linkedin: {
    color: "text-blue-600",
    bg: "bg-blue-600/15",
    hoverBg: "hover:bg-blue-700",
    hoverShadow: "hover:shadow-[0_0_12px_rgba(37,99,235,0.4)]",
    lightColor: "light:text-blue-700",
    lightBg: "light:bg-blue-100",
    lightHoverBg: "light:hover:bg-blue-600 light:hover:text-white",
    svg: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>,
  },
};

function SocialSidebarIcons({ collapsed }: { collapsed: boolean }): ReactNode {
  const { data: links } = useQuery({
    queryKey: ["social-links"],
    queryFn: async () => {
      const res = await api.get<{ id: string; platform: string; label: string; url: string }[]>("/social-links/active");
      return res.data ?? [];
    },
    staleTime: 60_000,
  });

  if (collapsed || !links || links.length === 0) return null;

  return (
    <div className="shrink-0 border-t border-white/5 py-1.5 light:border-neutral-200">
      <div className="flex items-center justify-center gap-3">
        {links.map((link) => {
          if (!(link.platform in PLATFORM_CONFIG)) return null;
          const style = PLATFORM_CONFIG[link.platform];

          return (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${style.bg} ${style.color} ${style.hoverBg} ${style.hoverShadow} ${style.lightBg} ${style.lightColor} ${style.lightHoverBg}`}
              aria-label={link.label}
            >
              {style.svg}
            </a>
          );
        })}
      </div>
    </div>
  );
}

export type { SidebarProps, SidebarItem, SidebarSection, SidebarContent };
