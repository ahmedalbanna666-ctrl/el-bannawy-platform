import { memo, type ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface RelationVocabularyTableProps {
  readonly items: readonly {
    readonly id: string;
    readonly word: string;
    readonly translation: string;
    readonly synonym?: string | null;
    readonly synonymTranslation?: string | null;
    readonly antonym?: string | null;
    readonly antonymTranslation?: string | null;
  }[];
  readonly canManage?: boolean;
}

function RelationVocabularyTableBase({
  items,
  canManage = false,
}: RelationVocabularyTableProps): ReactNode {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900/40">
      <Table dir="ltr">
        <TableHeader>
          <TableRow className="h-11 border-b border-neutral-200 bg-primary-50/60 dark:border-neutral-700 dark:bg-primary-500/5">
            <TableHead className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              الكلمة
            </TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              المعنى
            </TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              المرادف
            </TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wider text-danger-600 dark:text-danger-400">
              المضاد
            </TableHead>
            {canManage && (
              <TableHead className="text-xs font-bold uppercase tracking-wider text-neutral-500 text-end">
                إجراءات
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((vocab) => (
            <TableRow
              key={vocab.id}
              className="border-b border-neutral-100 transition-colors last:border-0 hover:bg-primary-50/40 dark:border-neutral-800 dark:hover:bg-primary-500/5"
            >
              <TableCell className="py-3 text-sm font-semibold text-primary-600 dark:text-primary-400">
                {vocab.word}
              </TableCell>
              <TableCell
                className="py-3 text-sm text-neutral-900 dark:text-neutral-100"
                dir="rtl"
              >
                {vocab.translation}
              </TableCell>
              <TableCell
                className="py-3 text-sm text-neutral-900 dark:text-neutral-100"
                dir="rtl"
              >
                {vocab.synonym ? (
                  <span>
                    {vocab.synonym}
                    {vocab.synonymTranslation && (
                      <span className="mr-1 text-xs text-neutral-400">
                        ({vocab.synonymTranslation})
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-neutral-300 dark:text-neutral-600">—</span>
                )}
              </TableCell>
              <TableCell
                className="py-3 text-sm text-neutral-900 dark:text-neutral-100"
                dir="rtl"
              >
                {vocab.antonym ? (
                  <span>
                    {vocab.antonym}
                    {vocab.antonymTranslation && (
                      <span className="mr-1 text-xs text-neutral-400">
                        ({vocab.antonymTranslation})
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-neutral-300 dark:text-neutral-600">—</span>
                )}
              </TableCell>
              {canManage && (
                <TableCell className="py-3 text-end">
                  <span className="text-xs text-neutral-400">—</span>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export const RelationVocabularyTable = memo(RelationVocabularyTableBase);
export type { RelationVocabularyTableProps };
