import { Languages, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { detectTextDirection } from "@/lib/text-direction";

interface VocabularyGroupHeaderProps {
  readonly title: string;
  readonly count: number;
  readonly kind?: string;
}

export function VocabularyGroupHeader({
  title,
  count,
  kind,
}: VocabularyGroupHeaderProps): React.ReactNode {
  const isRelation = kind === "SYNONYM_ANTONYM";
  const direction = detectTextDirection(title);

  return (
    <div className="flex items-center justify-center gap-2 py-1.5 animate-[vocab-fade-in_220ms_ease-out] sm:gap-3">
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
  );
}
