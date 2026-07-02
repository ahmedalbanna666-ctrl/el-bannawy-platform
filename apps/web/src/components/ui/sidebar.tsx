"use client";

import { cn } from "@/lib/utils";
import { useState, type ReactNode } from "react";
import { ChevronLeft, User, type LucideIcon } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";

interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
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
}

function isSection(item: SidebarItem | SidebarSection): item is SidebarSection {
  return "items" in item && Array.isArray(item.items);
}

function isDivider(item: SidebarItem): boolean {
  return item.divider === true;
}

export function Sidebar({ items, className, onClose, onProfileClick, profileGrade }: SidebarProps): ReactNode {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuthStore();

  const fullName = user?.fullName ?? "";
  const firstName = fullName ? fullName.split(" ")[0] : "";
  const gradeLabel = profileGrade ?? user?.role ?? "Student";
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName || "User")}&background=22D3EE&color=fff&bold=true&font-size=0.33`;

  const handleItemClick = (item: SidebarItem): void => {
    if (item.divider) return;
    item.onClick?.();
    onClose?.();
  };

  const navItemClass = (item: SidebarItem): string =>
    cn(
      "flex w-full items-center gap-[14px] rounded-[14px] px-[15px] py-3 text-[0.95rem] font-bold transition-all duration-200",
      !collapsed && "justify-start",
      collapsed && "justify-center px-0 py-3",
      item.active
        ? "bg-[#22D3EE]/10 text-[#22D3EE]"
        : item.danger
          ? "border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.06)] text-slate-100 hover:bg-[#ef4444] hover:text-white hover:shadow-[0_5px_15px_rgba(239,68,68,0.3)] light:border-[rgba(239,68,68,0.25)] light:bg-[rgba(239,68,68,0.04)] light:text-slate-900"
          : "text-slate-100 hover:-translate-x-1 hover:bg-[#1e293b]/80 hover:text-[#22D3EE] hover:backdrop-blur-[10px] hover:border hover:border-white/10 light:text-slate-900 light:hover:bg-slate-100 light:hover:text-[#0891B2] light:hover:border-slate-200",
    );

  const iconClass = (item: SidebarItem): string =>
    cn(
      "h-[1.3rem] w-[1.3rem] shrink-0",
      item.danger
        ? "text-[#ef4444]"
        : item.active
          ? "text-[#22D3EE]"
          : "text-slate-300 light:text-slate-500",
    );

  return (
    <aside
      className={cn(
        "hidden h-screen flex-col border-l border-white/10 bg-transparent transition-[width] duration-300 dark:bg-transparent light:border-slate-200 lg:flex",
        "overflow-y-auto pb-24 pt-8",
        "[scrollbar-width:thin]",
        "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent",
        "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20",
        "hover:[&::-webkit-scrollbar-thumb]:bg-white/40",
        collapsed ? "w-[72px] px-3" : "w-[280px] px-5",
        className,
      )}
    >
      {/* Brand + Collapse Toggle */}
      <div className="mb-10 flex items-center justify-between">
        {!collapsed ? (
          <span className="font-cairo text-lg font-black text-slate-50 light:text-slate-900">
            MR.{" "}
            <span className="text-[#22D3EE] drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">
              AL-BANNA
            </span>
          </span>
        ) : (
          <span className="font-cairo text-lg font-black text-[#22D3EE] drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">
            B
          </span>
        )}
        <button
          onClick={(): void => { setCollapsed(!collapsed); }}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white light:text-slate-500 light:hover:bg-slate-100 light:hover:text-slate-700"
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

      {/* Profile Card */}
      {!collapsed && (
        <div
          onClick={onProfileClick}
          onKeyDown={(e): void => { if (e.key === "Enter" || e.key === " ") { onProfileClick?.(); } }}
          role="button"
          tabIndex={0}
          className="group mb-6 cursor-pointer rounded-[20px] border border-[rgba(34,211,238,0.2)] bg-[#0f172a]/65 px-[15px] py-4 backdrop-blur-xl shadow-[0_8px_20px_rgba(0,0,0,0.3),0_0_20px_rgba(34,211,238,0.12)] transition-all duration-300 hover:border-[rgba(34,211,238,0.5)] hover:bg-[#1e293b]/80 hover:shadow-[0_10px_25px_rgba(34,211,238,0.18)] light:border-slate-200 light:bg-white/85 light:shadow-[0_4px_15px_rgba(0,0,0,0.06)] light:hover:bg-white light:hover:shadow-[0_8px_25px_rgba(6,182,212,0.1)]"
        >
          <div className="mb-[15px] flex items-center gap-3">
            <img
              src={avatarUrl}
              alt=""
              className="h-[52px] w-[52px] shrink-0 rounded-full border-2 border-[#22D3EE] shadow-[0_0_15px_rgba(34,211,238,0.2)] object-cover"
            />
            <div className="flex flex-col justify-center gap-[3px]">
              <span className="text-[1.05rem] font-extrabold leading-none text-slate-50 light:text-slate-900">
                {firstName || "Student"}
              </span>
              <span className="text-[0.75rem] font-semibold leading-none text-slate-400 light:text-slate-500">
                {gradeLabel}
              </span>
            </div>
          </div>
          <div className="-mx-[15px] mb-[15px] h-px bg-[rgba(34,211,238,0.2)] light:bg-slate-200" />
          <div className="flex items-center justify-between text-sm font-bold text-[#22D3EE] transition-transform duration-300 group-hover:translate-x-1">
            <span className="flex items-center gap-2">
              <User className="h-4 w-4" />
              عرض الملف الشخصي
            </span>
            <ChevronLeft className="h-3.5 w-3.5" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1">
        {items.map((entry, _idx) => {
          if (isSection(entry)) {
            return (
              <div key={entry.title}>
                <ul className="flex flex-col gap-2">
                  {entry.items.map((item) => (
                    <li key={item.id}>
                      {isDivider(item) && !collapsed ? (
                        <div className="mx-2 my-1 h-px bg-white/5 light:bg-slate-200" />
                      ) : (
                        <button
                          onClick={(): void => { handleItemClick(item); }}
                          className={navItemClass(item)}
                          title={collapsed ? item.label : undefined}
                        >
                          <item.icon className={iconClass(item)} />
                          {!collapsed && (
                            <>
                              <span className="flex-1 text-start">{item.label}</span>
                              {item.badge !== undefined && (
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#22D3EE] px-1.5 text-[10px] font-bold text-white">
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          }

          if (isDivider(entry) && !collapsed) {
            return (
              <div key={entry.id} className="mx-2 my-1 h-px bg-white/5 light:bg-slate-200" />
            );
          }

          return (
            <button
              key={entry.id}
              onClick={(): void => { handleItemClick(entry); }}
              className={navItemClass(entry)}
              title={collapsed ? entry.label : undefined}
            >
              <entry.icon className={iconClass(entry)} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-start">{entry.label}</span>
                  {entry.badge !== undefined && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#22D3EE] px-1.5 text-[10px] font-bold text-white">
                      {entry.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export type { SidebarProps, SidebarItem, SidebarSection, SidebarContent };
