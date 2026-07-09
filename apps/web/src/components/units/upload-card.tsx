"use client";

import { useRef, type ChangeEvent, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Upload, FileText, Trash2, Loader2, type LucideIcon } from "lucide-react";

type UploadState = "empty" | "uploaded" | "uploading";

interface FileInfo {
  readonly name: string;
  readonly size: string;
}

interface UploadCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  accept: string;
  state: UploadState;
  fileInfo?: FileInfo | null;
  uploadProgress?: number;
  onFileSelect: (file: File) => void;
  onDelete: () => void;
  className?: string;
}

export function UploadCard({
  title,
  description,
  icon: Icon,
  accept,
  state,
  fileInfo,
  uploadProgress = 0,
  onFileSelect,
  onDelete,
  className,
}: UploadCardProps): ReactNode {
  const inputRef = useRef<HTMLInputElement>(null);

  const triggerFileInput = (): void => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    e.target.value = "";
  };

  return (
    <Card variant="elevated" padding="none" className={cn("overflow-hidden", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      <div className="flex items-center gap-3 border-b border-neutral-200 px-5 py-3 dark:border-neutral-700">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10">
          <Icon className="h-5 w-5 text-primary-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            {title}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
        </div>
      </div>

      <CardContent className="p-5">
        {state === "uploading" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
              <span>جاري الرفع...</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
              <div
                className="h-full rounded-full bg-primary-500 transition-all duration-300"
                style={{ width: `${String(uploadProgress)}%` }}
              />
            </div>
          </div>
        )}

        {state === "empty" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
              <Upload className="h-6 w-6 text-neutral-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                لا يوجد ملف مرفوع
              </p>
              <p className="text-xs text-neutral-400 mt-0.5">
                {accept} — الحد الأقصى 10MB
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={triggerFileInput}>
              <Upload className="h-4 w-4" />
              رفع ملف
            </Button>
          </div>
        )}

        {state === "uploaded" && fileInfo && (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-500/10">
              <FileText className="h-5 w-5 text-success-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {fileInfo.name}
              </p>
              <p className="text-xs text-neutral-400">{fileInfo.size}</p>
            </div>
            <Button variant="outline" size="sm" onClick={triggerFileInput}>
              استبدال
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onDelete}
              aria-label="حذف الملف"
              className="text-danger-500 hover:bg-danger-500/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type { UploadCardProps, UploadState, FileInfo };
