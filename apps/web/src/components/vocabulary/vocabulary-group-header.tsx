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
    <div className="flex items-center justify-center gap-3 py-1.5 animate-[vocab-fade-in_220ms_ease-out]">
      <span className="h-px flex-1 max-w-[120px] bg-gradient-to-r from-transparent to-primary-300/70 dark:to-primary-400/40" />
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 shadow-sm transition-transform duration-150 hover:scale-[1.02]",
          isRelation
            ? "border-amber-300/70 bg-amber-500/10 dark:border-amber-400/40 dark:bg-amber-400/10"
            : "border-primary-300/70 bg-primary-500/10 dark:border-primary-400/40 dark:bg-primary-400/10",
        )}
      >
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full",
            isRelation
              ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
              : "bg-primary-500/20 text-primary-600 dark:text-primary-400",
          )}
        >
          {isRelation ? (
            <Sparkles className="h-3 w-3" />
          ) : (
            <Languages className="h-3 w-3" />
          )}
        </span>
        <h3
          dir={direction}
          className="text-sm font-extrabold tracking-tight text-neutral-800 dark:text-neutral-100"
        >
          {title}
        </h3>
        <span
          dir="ltr"
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold",
            isRelation
              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
              : "bg-primary-500/20 text-primary-700 dark:text-primary-300",
          )}
        >
          {count} {isRelation ? "علاقة" : "كلمة"}
        </span>
      </div>
      <span className="h-px flex-1 max-w-[120px] bg-gradient-to-l from-transparent to-primary-300/70 dark:to-primary-400/40" />
    </div>
  );
}
