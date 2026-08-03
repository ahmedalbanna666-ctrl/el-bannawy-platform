"use client";

import { type ReactNode } from "react";
import { Download, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  certificateDownloadUrl,
  certificateViewUrl,
  type UnitCertificate,
} from "@/lib/certificates";

interface CertificateModalProps {
  certificate: UnitCertificate | null;
  onClose: () => void;
}

export function CertificateModal({
  certificate,
  onClose,
}: CertificateModalProps): ReactNode {
  if (!certificate) return null;

  const earnedDate = new Date(certificate.earnedAt).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Dialog open={Boolean(certificate)} onClose={onClose} className="max-w-2xl">
      <DialogContent>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10">
            <FileText className="h-5 w-5 text-primary-500" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
              شهادة إتمام الوحدة {String(certificate.unit.displayOrder)} — {certificate.unit.title}
            </h3>
            <p className="text-xs text-neutral-500">{earnedDate}</p>
          </div>
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
          <iframe
            title="شهادة التقدير"
            src={certificateViewUrl(certificate.id)}
            className="h-[420px] w-full"
          />
        </div>
      </DialogContent>
      <DialogFooter>
        <Button
          variant="ghost"
          onClick={onClose}
        >
          إغلاق
        </Button>
        <a href={certificateDownloadUrl(certificate.id)} download>
          <Button variant="primary">
            <Download className="h-4 w-4" />
            تحميل الشهادة PDF
          </Button>
        </a>
      </DialogFooter>
    </Dialog>
  );
}
