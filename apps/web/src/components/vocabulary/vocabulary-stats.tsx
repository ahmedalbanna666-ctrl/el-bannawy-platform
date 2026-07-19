import { BookA, Layers, GitCompareArrows, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface VocabularyStatsProps {
  readonly words: number;
  readonly groups: number;
  readonly relations: number;
  readonly className?: string;
}

interface StatItem {
  readonly label: string;
  readonly value: number;
  readonly icon: LucideIcon;
}

export function VocabularyStats({
  words,
  groups,
  relations,
  className,
}: VocabularyStatsProps): React.ReactNode {
  const items: readonly StatItem[] = [
    { label: "كلمة", value: words, icon: BookA },
    { label: "مجموعة", value: groups, icon: Layers },
    { label: "علاقة", value: relations, icon: GitCompareArrows },
  ];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 animate-[vocab-fade-slide-down_200ms_ease-out]",
        className,
      )}
    >
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div
            key={it.label}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white/70 px-3 py-1.5 shadow-sm backdrop-blur-sm transition-colors hover:border-primary-300 dark:border-neutral-700 dark:bg-neutral-800/40 dark:hover:border-primary-500/40"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span
              dir="ltr"
              className="text-base font-bold tabular-nums text-neutral-900 dark:text-neutral-100"
            >
              {it.value}
            </span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">{it.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export type { VocabularyStatsProps };
