"use client";

import { type ReactNode } from "react";
import { Wrench, MessageCircle, Clock3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buildWhatsAppLink } from "@/lib/page-status";

interface MaintenanceScreenProps {
  title: string;
  message: string;
  whatsapp?: string;
}

export function MaintenanceScreen({ title, message, whatsapp }: MaintenanceScreenProps): ReactNode {
  const waNumber = whatsapp?.trim() ?? process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  const waLink = waNumber ? buildWhatsAppLink(waNumber) : null;
  return (
    <div className="flex min-h-[60dvh] items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-warning-500/10">
          <Wrench className="h-8 w-8 text-warning-500" />
        </div>

        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{message}</p>

        <div className="mt-5 flex items-center justify-center gap-2">
          <Clock3 className="h-4 w-4 text-primary-500" />
          <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
            متاح قريباً
          </span>
        </div>

        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 block"
          >
            <Button variant="success" fullWidth leftIcon={<MessageCircle className="h-5 w-5" />}>
              تواصل مع الدعم الفني عبر واتساب
            </Button>
          </a>
        )}
      </Card>
    </div>
  );
}
