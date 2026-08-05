import { Languages, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { detectTextDirection } from "@/lib/text-direction";

interface VocabularyGroupHeaderProps {
  readonly title: string;
  readonly count: number;
  readonly kind?: string;
}

/** Split a mixed English/Arabic title into its two script portions. */
function splitTitleLanguages(title: string): { english: string; arabic: string } {
  let english = "";
  let arabic = "";
  for (const ch of title) {
    if (/[\u0600-\u06FF]/.test(ch)) {
      arabic += ch;
      english += " ";
    } else {
      english += ch;
      arabic += " ";
    }
  }
  const clean = (s: string): string =>
    s.replace(/\s+/g, " ").replace(/^[\s\-—–|/:()[\]]+/, "").replace(/[\s\-—–|/:()[\]]+$/, "").trim();
  return { english: clean(english), arabic: clean(arabic) };
}

export function VocabularyGroupHeader({
  title,
  count,
  kind,
}: VocabularyGroupHeaderProps): React.ReactNode {
  const isRelation = kind === "SYNONYM_ANTONYM";
  const direction = detectTextDirection(title);
  const { english: englishTitle, arabic: arabicTitle } = splitTitleLanguages(title);

  return (
    <>
      {/* Mobile: compact two-line title — badge left, icon right, title centered */}
      <div className="flex items-center gap-2 px-1 py-1 animate-[vocab-fade-in_220ms_ease-out] sm:hidden">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
            isRelation
              ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
              : "bg-primary-500/20 text-primary-600 dark:text-primary-400",
          )}
        >
          {isRelation ? (
            <Sparkles className="h-3.5 w-3.5" />
          ) : (
            <Languages className="h-3.5 w-3.5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          {englishTitle && (
            <p dir="ltr" className="text-[13px] font-bold leading-tight text-neutral-800 dark:text-neutral-100">
              {englishTitle}
            </p>
          )}
          {arabicTitle && (
            <p dir="rtl" className="text-xs font-semibold leading-snug text-neutral-500 dark:text-neutral-400">
              {arabicTitle}
            </p>
          )}
        </div>
        <span
          dir="ltr"
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold",
            isRelation
              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
              : "bg-primary-500/20 text-primary-700 dark:text-primary-300",
          )}
        >
          {count} {isRelation ? "علاقة" : "كلمة"}
        </span>
      </div>

      {/* Tablet / desktop: centered pill with decorative lines */}
      <div className="hidden items-center justify-center gap-2 py-1.5 animate-[vocab-fade-in_220ms_ease-out] sm:flex sm:gap-3">
        <span className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-primary-300/70 dark:to-primary-400/40 sm:max-w-[120px]" />
        <div
          className={cn(
            "inline-flex min-w-0 max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 shadow-sm transition-transform duration-150 hover:scale-[1.02] sm:gap-2 sm:px-4 sm:py-1.5",
            isRelation
              ? "border-amber-300/70 bg-amber-500/10 dark:border-amber-400/40 dark:bg-amber-400/10"
              : "border-primary-300/70 bg-primary-500/10 dark:border-primary-400/40 dark:bg-primary-400/10",
          )}
        >
          <span
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded-full sm:h-5 sm:w-5",
              isRelation
                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                : "bg-primary-500/20 text-primary-600 dark:text-primary-400",
            )}
          >
            {isRelation ? (
              <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            ) : (
              <Languages className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            )}
          </span>
          <h3
            dir={direction}
            className="truncate text-xs font-extrabold tracking-tight text-neutral-800 dark:text-neutral-100 sm:text-sm"
          >
            {title}
          </h3>
          <span
            dir="ltr"
            className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold sm:px-2",
              isRelation
                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                : "bg-primary-500/20 text-primary-700 dark:text-primary-300",
            )}
          >
            {count} {isRelation ? "علاقة" : "كلمة"}
          </span>
        </div>
        <span className="h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-primary-300/70 dark:to-primary-400/40 sm:max-w-[120px]" />
      </div>
    </>
  );
}
