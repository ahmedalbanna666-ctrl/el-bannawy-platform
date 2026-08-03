"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useReferralPopup, useRecordPopupView } from "@/lib/referral/referral-api";
import { Gift, Copy, CheckCircle2, Coins, Percent } from "lucide-react";

export function ReferralPopup(): ReactNode {
  const { data: popup, isLoading, isFetching } = useReferralPopup();
  const { mutateAsync: recordView } = useRecordPopupView();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  const shouldShow = popup?.shouldShow === true && !!popup.campaign;

  useEffect(() => {
    if (isLoading || isFetching || dismissed) return;
    if (!shouldShow) return;

    const timer = setTimeout(() => {
      setOpen(true);
      if (popup.campaign) {
        void recordView(popup.campaign.id).catch(() => undefined);
      }
    }, 4000);
    return (): void => { clearTimeout(timer); };
  }, [isLoading, isFetching, shouldShow, dismissed, popup?.campaign?.id, recordView]);

  const handleClose = (): void => {
    setOpen(false);
    setDismissed(true);
  };

  const handleCopy = async (): Promise<void> => {
    if (!popup?.link) return;
    try {
      await navigator.clipboard.writeText(popup.link);
      setCopied(true);
      setTimeout(() => { setCopied(false); }, 2000);
    } catch {
      // ignore
    }
  };

  if (!popup?.campaign) return null;

  const campaign = popup.campaign;

  return (
    <Dialog open={open} onClose={handleClose} title={campaign.title}>
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/10">
          <Gift className="h-8 w-8 text-primary-500" />
        </div>

        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{campaign.message}</p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge variant="primary" className="gap-1">
            <Percent className="h-3 w-3" /> وحدة {campaign.unitRewardPercent}%
          </Badge>
          <Badge variant="primary" className="gap-1">
            <Percent className="h-3 w-3" /> ترم {campaign.termRewardPercent}%
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Coins className="h-3 w-3" /> مكافأة بالعملات
          </Badge>
        </div>

        {popup.code ? (
          <div className="w-full rounded-xl border-2 border-dashed border-primary-500/40 bg-primary-500/5 px-4 py-3">
            <code dir="ltr" className="font-mono text-lg font-black tracking-[0.3em] text-primary-600 dark:text-primary-400">
              {popup.code}
            </code>
          </div>
        ) : null}

        <Button variant="primary" fullWidth onClick={() => { void handleCopy(); }}>
          {copied ? <CheckCircle2 className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
          {copied ? "تم نسخ كود الدعوة" : "نسخ كود الدعوة"}
        </Button>

        <Button variant="ghost" size="sm" onClick={handleClose}>
          لاحقاً
        </Button>
      </div>
    </Dialog>
  );
}
