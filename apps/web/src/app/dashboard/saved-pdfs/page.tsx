"use client";

import { type ReactNode, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { FileText, Download, Trash2, ExternalLink, BookOpen } from "lucide-react";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface SavedDocument {
  readonly id: string;
  readonly lessonId: string;
  readonly fileName: string;
  readonly fileSize: number;
  readonly mimeType: string;
  readonly createdAt: string;
  readonly lesson: { readonly title: string } | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SavedPdfsPage(): ReactNode {
  const queryClient = useQueryClient();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["saved-documents"],
    queryFn: async (): Promise<readonly SavedDocument[]> => {
      const res = await api.get<readonly SavedDocument[]>("/saved-documents");
      return res.data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/saved-documents/${id}`),
    onSuccess: () => {
      setDeleteError(null);
      void queryClient.invalidateQueries({ queryKey: ["saved-documents"] });
    },
    onError: () => {
      setDeleteError("حدث خطأ أثناء حذف الملف");
    },
  });

  const documents = data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            الملفات المحفوظة
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            PDF الوصول السريع إلى ملفات
          </p>
        </div>
      </div>

      {deleteError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {deleteError}
        </div>
      )}

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorState
          title="فشل تحميل الملفات"
          description={error instanceof Error ? error.message : "حدث خطأ غير متوقع"}
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !isError && documents.length === 0 && (
        <EmptyState
          title="لا توجد ملفات محفوظة"
          description="لم تقم بحفظ أي ملف PDF بعد. يمكنك حفظ الملفات من صفحة عرض الدرس."
        />
      )}

      {!isLoading && !isError && documents.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="group relative flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-primary-300 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-primary-600"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {doc.fileName}
                  </p>
                  {doc.lesson && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-neutral-500 dark:text-neutral-400">
                      <BookOpen className="h-3 w-3 shrink-0" />
                      {doc.lesson.title}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                    {formatFileSize(doc.fileSize)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/lessons/detail/${doc.lessonId}/pdf`}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  عرض
                </Link>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const a = window.document.createElement("a");
                    a.href = `${API_BASE_URL}/saved-documents/${doc.id}/download`;
                    a.download = doc.fileName;
                    a.click();
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-red-200 text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
                  onClick={() => {
                    if (confirm("هل أنت متأكد من حذف هذا الملف؟")) {
                      setDeleteError(null);
                      deleteMutation.mutate(doc.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
