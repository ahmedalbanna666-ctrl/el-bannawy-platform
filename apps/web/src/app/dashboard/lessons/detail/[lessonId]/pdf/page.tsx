"use client";

import { type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronRight, FileText } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface LessonDocumentMeta {
  readonly id: string;
  readonly fileName: string;
  readonly downloadable: boolean;
}

async function fetchDocumentBlob(lessonId: string): Promise<string> {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}/lessons/${lessonId}/document`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const message =
      response.status === 403
        ? "هذا الملف غير متاح للتحميل"
        : response.status === 404
          ? "الملف غير موجود"
          : "تعذر تحميل الملف";
    throw new Error(message);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export default function LessonPdfPage(): ReactNode {
  const params = useParams<{ lessonId: string }>();
  const router = useRouter();
  const lessonId = params.lessonId;

  const metaQuery = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async (): Promise<{ document: LessonDocumentMeta | null }> => {
      const res = await api.get<{ document: LessonDocumentMeta | null }>(`/lessons/${lessonId}`);
      if (!res.data) throw new Error("Lesson not found");
      return res.data;
    },
  });

  const blobQuery = useQuery({
    queryKey: ["lesson-document-blob", lessonId],
    queryFn: () => fetchDocumentBlob(lessonId),
    enabled: Boolean(metaQuery.data?.document?.downloadable),
  });

  if (metaQuery.isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[70vh] w-full" />
      </div>
    );
  }

  if (metaQuery.isError) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <ErrorState
          title="فشل تحميل الملف"
          description={metaQuery.error instanceof Error ? metaQuery.error.message : "حدث خطأ غير متوقع"}
          onRetry={() => void metaQuery.refetch()}
        />
      </div>
    );
  }

  const document = metaQuery.data?.document ?? null;

  if (!document) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <EmptyState title="لا يوجد ملف PDF" description="لم يتم رفع ملف لهذا الدرس." />
      </div>
    );
  }

  if (!document.downloadable) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <EmptyState title="الملف غير متاح" description="هذا الملف غير متاح للتحميل حالياً." />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-2rem)] max-w-5xl flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/lessons/detail/${lessonId}`}
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-primary-500"
        >
          <ChevronRight className="h-4 w-4" />
          العودة للدرس
        </Link>
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">
          <FileText className="h-4 w-4 text-primary-500" />
          {document.fileName}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void router.push(`/dashboard/lessons/detail/${lessonId}`);
          }}
        >
          إغلاق
        </Button>
      </div>

      {blobQuery.isLoading && <Skeleton className="h-full w-full" />}
      {blobQuery.isError && (
        <ErrorState
          title="تعذر عرض الملف"
          description={blobQuery.error instanceof Error ? blobQuery.error.message : "حدث خطأ غير متوقع"}
          onRetry={() => void blobQuery.refetch()}
        />
      )}
      {blobQuery.data && (
        <iframe
          title={document.fileName}
          src={blobQuery.data}
          className="h-full w-full rounded-xl border border-neutral-200 dark:border-neutral-700"
        />
      )}
    </div>
  );
}
