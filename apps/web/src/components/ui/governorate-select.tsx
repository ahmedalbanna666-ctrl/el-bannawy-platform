"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check, MapPin, Search } from "lucide-react";

const GOVERNORATES = [
  "القاهرة",
  "الإسكندرية",
  "الجيزة",
  "القليوبية",
  "البحيرة",
  "مطروح",
  "دمياط",
  "الدقهلية",
  "الشرقية",
  "الغربية",
  "المنوفية",
  "كفر الشيخ",
  "بورسعيد",
  "الإسماعيلية",
  "السويس",
  "شمال سيناء",
  "جنوب سيناء",
  "الفيوم",
  "بني سويف",
  "المنيا",
  "أسيوط",
  "سوهاج",
  "قنا",
  "الأقصر",
  "أسوان",
  "البحر الأحمر",
  "الوادي الجديد",
];

interface GovernorateSelectProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
  placeholder?: string;
  error?: string;
}

export function GovernorateSelect({
  value,
  onChange,
  required = true,
  disabled = false,
  className,
  label = "المحافظة",
  placeholder = "اختر المحافظة",
  error,
}: GovernorateSelectProps): ReactNode {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const reactId = useId();
  const fieldId = label ? label.toLowerCase().replace(/\s+/g, "-") : reactId;
  const listboxId = `${fieldId}-listbox`;

  useEffect((): (() => void) => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      searchInputRef.current?.focus();
    }

    return (): void => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const filtered = useMemo((): string[] => {
    const q = query.trim();
    if (q.length === 0) return GOVERNORATES;
    return GOVERNORATES.filter((g): boolean => g.includes(q));
  }, [query]);

  const handleSelect = (governorate: string): void => {
    onChange(governorate);
    setQuery("");
    setOpen(false);
  };

  const toggle = (): void => {
    if (disabled) return;
    setOpen((prev): boolean => !prev);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={fieldId}
          className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          {label}
          {required && <span className="text-danger-500"> *</span>}
        </label>
      )}
      <div ref={containerRef} className="relative">
        <button
          type="button"
          id={fieldId}
          onClick={toggle}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          className={cn(
            "flex h-12 w-full items-center justify-between gap-2 rounded-xl border-2 bg-transparent px-4 text-base text-neutral-900 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-100",
            error
              ? "border-danger-500 focus:border-danger-500"
              : open
                ? "border-primary-500"
                : "border-neutral-300 dark:border-neutral-600",
            className,
          )}
        >
          <span
            className={cn(
              "flex min-w-0 items-center gap-2 truncate",
              !value && "text-neutral-400 dark:text-neutral-500",
            )}
          >
            <MapPin className="h-5 w-5 shrink-0 text-neutral-400" />
            <span className="truncate">{value || placeholder}</span>
          </span>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-neutral-400 transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>

        {open && (
          <div
            id={listboxId}
            role="listbox"
            className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border-2 border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
          >
            <div className="relative border-b border-neutral-200 dark:border-neutral-700">
              <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-neutral-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e): void => {
                  setQuery(e.target.value);
                }}
                placeholder="ابحث عن محافظة..."
                className="h-11 w-full bg-transparent ps-10 pe-3 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none dark:text-neutral-100 dark:placeholder-neutral-500"
              />
            </div>
            <ul className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-4 py-3 text-sm text-neutral-400">
                  لا توجد نتائج
                </li>
              ) : (
                filtered.map((g): ReactNode => {
                  const selected = value === g;
                  return (
                    <li key={g} role="option" aria-selected={selected}>
                      <button
                        type="button"
                        onClick={(): void => {
                          handleSelect(g);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 px-4 py-2.5 text-sm transition-colors",
                          selected
                            ? "bg-primary-500/10 font-medium text-primary-600 dark:text-primary-400"
                            : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 shrink-0 text-neutral-400" />
                          {g}
                        </span>
                        {selected && <Check className="h-4 w-4 shrink-0 text-primary-500" />}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-danger-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export { GOVERNORATES };
