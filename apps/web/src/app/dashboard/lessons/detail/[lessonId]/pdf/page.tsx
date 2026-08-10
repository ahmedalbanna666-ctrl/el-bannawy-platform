"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Document, Page, pdfjs } from "react-pdf";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText, Download, Bookmark, BookmarkCheck, X, CheckCircle } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface LessonDocumentMeta {
  readonly id: string;
  readonly fileName: string;
  readonly downloadable: boolean;
}

async function fetchDocumentBlob(lessonId: string): Promise<ArrayBuffer> {
  const response = await fetch(`${API_BASE_URL}/lessons/${lessonId}/document`, {
    credentials: "include",
    cache: "no-store",
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
  return response.arrayBuffer();
}

async function fetchSavedStatus(lessonId: string): Promise<boolean> {
  const res = await api.get<readonly { lessonId: string }[]>("/saved-documents");
  return (res.data ?? []).some((d) => d.lessonId === lessonId);
}

function PdfViewer({ file }: { file: ArrayBuffer }): ReactNode {
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccess = useCallback(({ numPages: n }: { numPages: number }): void => {
    setNumPages(n);
    setLoadError(null);
  }, []);

  useEffect(() => {
    const measure = (): void => {
      setPageWidth(containerRef.current?.clientWidth ?? 0);
    };
    measure();
    window.addEventListener("resize", measure);
    return (): void => {
      window.removeEventListener("resize", measure);
    };
  }, []);

  const width = Math.max(pageWidth - 24, 320);

  return (
    <div ref={containerRef} className="h-full overflow-y-auto bg-neutral-100 p-3 dark:bg-neutral-900">
      <Document
        file={file}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={(err: Error): void => {
          console.error("[PDF] failed to load:", err);
          setLoadError(err instanceof Error ? err.message : String(err));
        }}
        loading={<Skeleton className="mx-auto h-96 w-full max-w-2xl" />}
        error={
          <p className="py-16 text-center text-sm text-neutral-500">
            تعذر عرض الملف{loadError ? ` (${loadError})` : ""}
          </p>
        }
      >
        {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
          <div key={n} className="mx-auto mb-4 w-fit max-w-full overflow-hidden rounded-lg bg-white shadow-md last:mb-0 dark:bg-neutral-800">
            <Page
              pageNumber={n}
              width={width}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </div>
        ))}
      </Document>
    </div>
  );
}

export default function LessonPdfPage(): ReactNode {
  const params = useParams<{ lessonId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
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
    staleTime: Infinity,
  });

  const savedQuery = useQuery({
    queryKey: ["saved-documents-status", lessonId],
    queryFn: () => fetchSavedStatus(lessonId),
  });

  const saveMutation = useMutation({
    mutationFn: () => api.post(`/saved-documents/${lessonId}`),
    onSuccess: () => {
      setSaveError(null);
      setSaveSuccess(true);
      setTimeout(() => { setSaveSuccess(false); }, 2000);
      void queryClient.invalidateQueries({ queryKey: ["saved-documents-status"] });
    },
    onError: (err: Error) => {
      setSaveError(err.message);
    },
  });

  const docMeta = metaQuery.data?.document ?? null;
  const isSaved = savedQuery.data ?? false;
  const [isDownloading, setIsDownloading] = useState(false);
  const documentUrl = `${API_BASE_URL}/lessons/${lessonId}/document`;

  if (metaQuery.isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-neutral-950">
        <div className="flex items-center justify-between border-b border-neutral-200 p-3 dark:border-neutral-800">
          <Skeleton className="h-5 w-40" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
        <Skeleton className="m-4 flex-1" />
      </div>
    );
  }

  if (metaQuery.isError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-neutral-950">
        <ErrorState
          title="فشل تحميل الملف"
          description={metaQuery.error instanceof Error ? metaQuery.error.message : "حدث خطأ غير متوقع"}
          onRetry={() => void metaQuery.refetch()}
        />
      </div>
    );
  }

  if (!docMeta) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-neutral-950">
        <EmptyState title="لا يوجد ملف PDF" description="لم يتم رفع ملف لهذا الدرس." />
      </div>
    );
  }

  if (!docMeta.downloadable) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-neutral-950">
        <EmptyState title="الملف غير متاح" description="هذا الملف غير متاح للتحميل حالياً." />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-neutral-950">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-3 py-2.5 dark:border-neutral-800 sm:px-4 sm:py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 truncate text-sm font-medium text-neutral-700 dark:text-neutral-200">
          <FileText className="h-4 w-4 shrink-0 text-primary-500" />
          <span className="truncate">{docMeta.fileName}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="px-3 sm:px-4"
            onClick={() => {
              setIsDownloading(true);
              const a = window.document.createElement("a");
              a.href = documentUrl;
              a.download = docMeta.fileName;
              a.click();
              setTimeout(() => { setIsDownloading(false); }, 1000);
            }}
            disabled={isDownloading}
          >
            <Download className="ml-1 h-4 w-4" />
            تحميل
          </Button>
          <Button
            variant={isSaved ? "secondary" : "primary"}
            size="sm"
            className="px-3 sm:px-4"
            onClick={() => {
              setSaveError(null);
              if (!isSaved) saveMutation.mutate();
            }}
            disabled={isSaved || saveMutation.isPending}
          >
            {isSaved || saveSuccess ? (
              <BookmarkCheck className="ml-1 h-4 w-4" />
            ) : (
              <Bookmark className="ml-1 h-4 w-4" />
            )}
            {isSaved || saveSuccess ? "تم الحفظ" : "حفظ"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { router.back(); }}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        {saveError && (
          <span className="w-full text-xs text-red-500 dark:text-red-400">{saveError}</span>
        )}
        {saveSuccess && (
          <span className="flex w-full items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <CheckCircle className="h-3 w-3" />
            تم الحفظ
          </span>
        )}
      </header>

      <div className="flex-1 overflow-hidden">
        {blobQuery.isLoading && <Skeleton className="h-full w-full" />}
        {blobQuery.isError && (
          <div className="flex h-full items-center justify-center">
            <ErrorState
              title="تعذر عرض الملف"
              description={blobQuery.error instanceof Error ? blobQuery.error.message : "حدث خطأ غير متوقع"}
              onRetry={() => void blobQuery.refetch()}
            />
          </div>
        )}
        {blobQuery.data && <PdfViewer file={blobQuery.data} />}
      </div>
    </div>
  );
}
